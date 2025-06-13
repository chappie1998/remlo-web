import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { 
  createTransferInstruction, 
  createAssociatedTokenAccountInstruction, 
  getAssociatedTokenAddress,
  getAccount
} from "@solana/spl-token";
import { SPL_TOKEN_ADDRESS, USDS_TOKEN_ADDRESS, RELAYER_URL, isValidSolanaAddress, getSolanaConnection } from "@/lib/solana";
import { isValidPasscode } from "@/lib/utils";
import { prepareMPCSigningKeypair } from "@/lib/mpc";
import { authOptions } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/jwt";
import { sign } from "tweetnacl";
import prisma from "@/lib/prisma";

// Background confirmation function using polling instead of WebSocket subscriptions
async function confirmTransactionInBackground(signature: string, transactionId: string) {
  try {
    const connection = getSolanaConnection();
    const maxRetries = 30; // 30 attempts
    const retryDelay = 2000; // 2 seconds between attempts
    
    console.log(`🔍 Starting background confirmation for transaction ${signature}`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check transaction status using getSignatureStatus (doesn't require WebSocket)
        const statusResponse = await connection.getSignatureStatus(signature, {
          searchTransactionHistory: true
        });
        
        if (statusResponse.value) {
          const status = statusResponse.value;
          
          if (status.err) {
            console.error(`❌ Transaction ${signature} failed:`, status.err);
            await prisma.transaction.update({
              where: { id: transactionId },
              data: { status: "failed" },
            });
            return;
          } else if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
            console.log(`✅ Transaction ${signature} confirmed successfully (${status.confirmationStatus})`);
            await prisma.transaction.update({
              where: { id: transactionId },
              data: { status: "confirmed" },
            });
            return;
          }
        }
        
        // If not confirmed yet, wait before next attempt
        if (attempt < maxRetries) {
          console.log(`⏳ Transaction ${signature} not confirmed yet (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        console.error(`Error checking transaction status (attempt ${attempt}):`, error);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // If we get here, transaction wasn't confirmed within the timeout
    console.warn(`⚠️ Transaction ${signature} confirmation timed out after ${maxRetries} attempts`);
    // Leave status as "submitted" - don't mark as failed since it might still confirm later
    
  } catch (error) {
    console.error(`Failed to confirm transaction ${signature}:`, error);
    // Don't update status on error - leave as "submitted"
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function POST(req: NextRequest) {
  const totalStartTime = Date.now();
  try {
    let userEmail = null;
    console.log('🚀 Handling send token transaction request (OPTIMIZED)');

    // First, try to get the session from NextAuth
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      userEmail = session.user.email;
      console.log('Found user email from NextAuth session:', userEmail);
    }

    // If no NextAuth session, try to get the user from JWT token (mobile app)
    if (!userEmail) {
      const userData = await getUserFromRequest(req);
      if (userData?.email) {
        userEmail = userData.email;
        console.log('Found user email from JWT token:', userEmail);
      }
    }

    // Legacy fallback: try to get the user from the Authorization header as session token
    if (!userEmail) {
      const authHeader = req.headers.get('authorization');
      console.log('Authorization header:', authHeader);

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log('Extracted token:', token);

        // Find the session in the database
        const dbSession = await prisma.session.findUnique({
          where: { sessionToken: token },
          include: { user: true }
        });

        console.log('Database session lookup result:', dbSession ? 'Found' : 'Not found');

        if (dbSession?.user?.email && dbSession.expires > new Date()) {
          userEmail = dbSession.user.email;
          console.log('Found user email from session token:', userEmail);
        } else {
          console.log('Invalid or expired session token');
        }
      }
    }

    if (!userEmail) {
      console.log('No valid user session found, returning 401');
      return NextResponse.json(
        { error: "You must be signed in to send a transaction" },
        {
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Extract the recipient address, amount, passcode, and tokenType from the request
    const { to, amount, passcode, username, backupShare, recoveryShare, tokenType } = await req.json();

    if (!to || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: to, amount" },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    if (!isValidSolanaAddress(to)) {
      return NextResponse.json(
        { error: "Invalid recipient address" },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    if (!isValidPasscode(passcode)) {
      return NextResponse.json(
        { error: "Passcode must be 6 digits" },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Get the user's wallet information
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        solanaAddress: true,
        usesMPC: true,
        mpcServerShare: true,
        mpcSalt: true,
        mpcBackupShare: true
      },
    });

    if (!user || !user.solanaAddress) {
      return NextResponse.json(
        { error: "Wallet not set up" },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Validate MPC wallet setup
    if (!user.usesMPC || !user.mpcServerShare || !user.mpcSalt) {
      return NextResponse.json(
        { error: "Wallet not set up properly" },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // If the client provided their own backup and recovery shares, use those
    // Otherwise, use the server's stored backup share for 3-part reconstruction
    const clientBackupShare = backupShare || user.mpcBackupShare;

    // Prepare the keypair using MPC with 3 shares
    const keypair = prepareMPCSigningKeypair(
      passcode,
      user.mpcServerShare,
      user.mpcSalt,
      clientBackupShare,
      recoveryShare
    );

    if (!keypair) {
      return NextResponse.json(
        { error: "Invalid passcode or shares" },
        {
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Verify the keypair corresponds to the user's address
    const keypairAddress = keypair.publicKey.toBase58();
    if (keypairAddress !== user.solanaAddress) {
      return NextResponse.json(
        { error: "Generated keypair does not match wallet address" },
        {
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Create a record of the transaction request
    // Determine which token address to use based on tokenType
    let tokenAddress = SPL_TOKEN_ADDRESS; // Default to USDC
    if (tokenType && (tokenType.toLowerCase() === 'usds' || tokenType.toLowerCase() === 'usd')) {
      tokenAddress = USDS_TOKEN_ADDRESS; // Use USDS if specified
      console.log(`Using USDS token address: ${USDS_TOKEN_ADDRESS}`);
    } else {
      console.log(`Using USDC token address: ${SPL_TOKEN_ADDRESS}`);
    }

    // Convert amount to token units (using 6 decimals for SPL token)
    const TOKEN_DECIMALS = 6;
    const amountInUnits = Math.floor(Number(amount) * (10 ** TOKEN_DECIMALS));

    console.log(`Creating token transfer: ${amount} ${tokenType || 'usdc'} tokens (${amountInUnits} units with ${TOKEN_DECIMALS} decimals)`);

    // Step 2: Create the transaction locally (OPTIMIZATION: No relayer call needed!)
    const transactionStartTime = Date.now();
    const connection = getSolanaConnection();
    const fromPublicKey = new PublicKey(user.solanaAddress);
    const toPublicKey = new PublicKey(to);
    
    // Determine token mint based on tokenType
    const tokenMint = new PublicKey(tokenAddress);
    
    console.log('⏱️ Starting ULTRA-FAST operations...');
    const parallelStartTime = Date.now();
    
    // RADICAL OPTIMIZATION: Minimize network calls
    // 1. Use cached/hardcoded relayer info to avoid network call
    // 2. Skip database username lookups (not critical for transaction)
    // 3. Use fastest possible blockhash retrieval
    
    const [
      { blockhash, lastValidBlockHeight },
      fromTokenAccount,
      toTokenAccount
    ] = await Promise.all([
      connection.getLatestBlockhash('finalized'), // Only essential RPC call
      getAssociatedTokenAddress(tokenMint, fromPublicKey),
      getAssociatedTokenAddress(tokenMint, toPublicKey)
    ]);
    
    // Use hardcoded relayer info to avoid network call
    const relayerPublicKey = new PublicKey('8XDvJwetWYaSSWQ6NkwJJ4yKJfqJm8PQgJKA438aFv1Q');
    
    const parallelTime = Date.now() - parallelStartTime;
    console.log(`⚡ ULTRA-FAST operations completed in ${parallelTime}ms`);

    // Skip username lookups for speed - not critical for transaction execution
    const recipientUsername = username || null;

        console.log('Transaction username debug:', {
      originalUsername: username,
      recipientUsername,
      to,
      senderId: user.id
    });

    // Create the transaction
    const unsignedTransaction = new Transaction();
    unsignedTransaction.recentBlockhash = blockhash;
    unsignedTransaction.lastValidBlockHeight = lastValidBlockHeight;
    
    // Set the fee payer to the relayer
    unsignedTransaction.feePayer = relayerPublicKey;
    
    // OPTIMIZED: Quick account check to avoid IllegalOwner error
    console.log(`🔍 Quick account check for: ${toTokenAccount.toString()}`);
    const accountCheckStart = Date.now();
    
    try {
      const accountInfo = await connection.getAccountInfo(toTokenAccount, 'processed');
      if (!accountInfo) {
        // Account doesn't exist, safe to create
        console.log(`➕ Adding account creation instruction (account doesn't exist)`);
        unsignedTransaction.add(
          createAssociatedTokenAccountInstruction(
            relayerPublicKey,  // Payer (relayer pays for account creation)
            toTokenAccount,    // Associated token account
            toPublicKey,       // Owner
            tokenMint          // Mint
          )
        );
      } else {
        console.log(`✅ Account exists, skipping creation`);
      }
    } catch (error) {
      // If account check fails, assume it doesn't exist and try to create
      console.log(`⚠️ Account check failed, assuming account doesn't exist:`, error);
      unsignedTransaction.add(
        createAssociatedTokenAccountInstruction(
          relayerPublicKey,  // Payer (relayer pays for account creation)
          toTokenAccount,    // Associated token account
          toPublicKey,       // Owner
          tokenMint          // Mint
        )
      );
    }
    
    const accountCheckTime = Date.now() - accountCheckStart;
    console.log(`⚡ Account check completed in ${accountCheckTime}ms`);
    
    // Add the transfer instruction
    unsignedTransaction.add(
      createTransferInstruction(
        fromTokenAccount,       // Source
        toTokenAccount,         // Destination  
        fromPublicKey,          // Owner
        BigInt(amountInUnits)   // Amount
      )
    );

    const transactionCreationTime = Date.now() - transactionStartTime;
    console.log(`✅ Transaction created locally in ${transactionCreationTime}ms`);
    console.log("Created transaction locally with following instructions:");
    unsignedTransaction.instructions.forEach((instruction, i) => {
      console.log(`- Instruction ${i}: Required signers:`,
        instruction.keys
          .filter(key => key.isSigner)
          .map(key => key.pubkey.toString())
      );
    });

    // Step 3: User signs the transaction
    console.log(`User signing transaction with address: ${keypair.publicKey.toString()}`);
    const messageToSign = unsignedTransaction.serializeMessage();
    const signature = sign.detached(messageToSign, keypair.secretKey);

    // Step 4: Serialize the signed transaction
    unsignedTransaction.addSignature(keypair.publicKey, Buffer.from(signature));

    // Log transaction signatures after user signs
    console.log("Transaction signatures after user signing:");
    unsignedTransaction.signatures.forEach((sig, i) => {
      console.log(`- Signature ${i}: ${sig.publicKey.toString()} - ${sig.signature ? 'signed' : 'not signed'}`);
    });

    const serializedSignedTransaction = unsignedTransaction.serialize({
      verifySignatures: false,
      requireAllSignatures: false
    }).toString('base64');

        // Step 5: Submit to relayer for final signing and submission
    const submitStartTime = Date.now();
    
    // We still need the relayer to sign as fee payer, but we can optimize this
    const submitResponse = await fetch(`${RELAYER_URL}/api/submit-transaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        signedTransaction: serializedSignedTransaction,
      }),
    });

    console.log(`Relayer submit response status: ${submitResponse.status}`);

    if (!submitResponse.ok) {
      let errorMessage = "Failed to submit transaction to relayer";
      try {
        const errorData = await submitResponse.json();
        errorMessage = errorData.error || errorMessage;
        console.error("Relayer submit error details:", errorData);
      } catch (parseError) {
        console.error("Could not parse relayer submit error response:", parseError);
      }
      throw new Error(errorMessage);
    }

    const submitData = await submitResponse.json();
    const { signature: txSignature } = submitData;

    const submitTime = Date.now() - submitStartTime;
    console.log(`✅ Transaction submitted via relayer in ${submitTime}ms`);
    console.log(`🚀 Transaction signature: ${txSignature}`);
    
    // SPEED OPTIMIZATION: Create database record asynchronously (don't wait)
    console.log('💾 Creating transaction record asynchronously...');
    const createTransactionRecord = async () => {
      try {
        const dbStartTime = Date.now();
        const transaction = await prisma.transaction.create({
          data: {
            txData: JSON.stringify({ to, amount, token: tokenAddress, tokenType }),
            status: "submitted",
            signature: txSignature,
            executedAt: new Date(),
            userId: user.id
          },
        });
        const dbTime = Date.now() - dbStartTime;
        console.log(`💾 Async database operation completed in ${dbTime}ms`);
        
        // Start background confirmation after DB record is created
        confirmTransactionInBackground(txSignature, transaction.id).catch(error => {
          console.error('Background confirmation failed:', error);
        });
      } catch (error) {
        console.error('Failed to create transaction record:', error);
      }
    };
    
    // Don't await this - let it run in background
    createTransactionRecord();

    // SPEED OPTIMIZATION: Handle payment request check asynchronously
    const handlePaymentRequest = async () => {
      try {
        // Find matching payment request that:
        // 1. Has the same recipient (to address) 
        // 2. Has the same amount
        // 3. Has the same token type
        // 4. Is still pending
        const matchingPaymentRequest = await prisma.paymentRequest.findFirst({
          where: {
            status: "PENDING",
            amount: amount,
            tokenType: tokenType.toLowerCase(),
            creator: {
              solanaAddress: to // The creator's address should match the recipient address
            }
          },
          include: {
            creator: {
              select: {
                id: true,
                solanaAddress: true,
                username: true
              }
            }
          }
        });

        if (matchingPaymentRequest) {
          console.log(`Found matching payment request: ${matchingPaymentRequest.shortId}`);
          
          // Create a payment record
          await prisma.payment.create({
            data: {
              payerId: user.id,
              paymentRequestId: matchingPaymentRequest.id,
              transactionSignature: txSignature,
              status: "CONFIRMED"
            }
          });

          // Update the payment request status to completed
          await prisma.paymentRequest.update({
            where: {
              id: matchingPaymentRequest.id
            },
            data: {
              status: "COMPLETED"
            }
          });

          console.log(`Payment request ${matchingPaymentRequest.shortId} automatically completed`);
        } else {
          console.log('No matching payment request found for this transaction');
        }
      } catch (paymentRequestError) {
        // Don't fail the transaction if payment request update fails
        console.error('Error checking/updating payment request:', paymentRequestError);
      }
    };
    
    // Don't await this - let it run in background
    handlePaymentRequest();

      const totalTime = Date.now() - totalStartTime;
      console.log(`🎉 TOTAL TRANSACTION TIME: ${totalTime}ms (vs ~14s before)`);

    return NextResponse.json(
      {
        success: true,
        signature: txSignature,
          message: "Token transaction submitted successfully to Solana blockchain",
          status: "submitted", // Indicate that transaction is submitted but not yet confirmed
          processingTime: totalTime
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );

  } catch (error) {
    console.error("Error sending token transaction:", error);

    // Update transaction record if it exists
    if (error instanceof Error && error.stack?.includes("transaction.id")) {
      try {
        const match = error.stack.match(/transaction\.id: ([a-zA-Z0-9-]+)/);
        if (match && match[1]) {
          const txId = match[1];
          await prisma.transaction.update({
            where: { id: txId },
            data: { status: "rejected" },
          });
        }
      } catch (updateError) {
        console.error("Failed to update transaction status:", updateError);
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Failed to send token transaction";
    return NextResponse.json(
      { error: errorMessage },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );
  }
}
