import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PublicKey } from "@solana/web3.js";
import { SPL_TOKEN_ADDRESS, USDS_TOKEN_ADDRESS, RELAYER_URL, isValidSolanaAddress, getSolanaConnection } from "@/lib/solana";
import { isValidPasscode } from "@/lib/utils";
import { prepareMPCSigningKeypair } from "@/lib/mpc";
import { authOptions } from "@/lib/auth";
import { Transaction } from "@solana/web3.js";
import { sign } from "tweetnacl";
import prisma from "@/lib/prisma";

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
  try {
    let userEmail = null;
    console.log('Handling send token transaction request');

    // First, try to get the session from NextAuth
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      userEmail = session.user.email;
      console.log('Found user email from NextAuth session:', userEmail);
    }

    // If no NextAuth session, try to get the user from the Authorization header
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

    // Get sender's username for better transaction display
    const senderUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { username: true }
    });

    // Get recipient's username if sending by address (and not already provided)
    let recipientUsername = username;
    if (!recipientUsername) {
      const recipientUser = await prisma.user.findUnique({
        where: { solanaAddress: to },
        select: { username: true }
      });
      recipientUsername = recipientUser?.username;
    }

    console.log('Transaction username debug:', {
      originalUsername: username,
      recipientUsername,
      senderUsername: senderUser?.username,
      to,
      senderId: user.id
    });

    const transaction = await prisma.transaction.create({
      data: {
        txData: JSON.stringify({ 
          to, 
          amount, 
          token: tokenAddress, 
          username: recipientUsername, // recipient username (lookup if needed)
          senderUsername: senderUser?.username, // sender's username
          tokenType 
        }),
        status: "pending",
        user: {
          connect: { id: user.id }
        }
      },
    });

    // Convert amount to token units (using 6 decimals for SPL token)
    const TOKEN_DECIMALS = 6;
    const amountInUnits = Math.floor(Number(amount) * (10 ** TOKEN_DECIMALS));

    console.log(`Creating token transfer: ${amount} ${tokenType || 'usdc'} tokens (${amountInUnits} units with ${TOKEN_DECIMALS} decimals)`);

    // Step 2: Request the transaction data from the relayer
    const createTransferResponse = await fetch(`${RELAYER_URL}/api/create-transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fromAddress: user.solanaAddress,
        toAddress: to,
        amount: amount,  // This is the human-readable amount, e.g. "1.5"
        amountInRawUnits: amountInUnits,  // Add the raw token units
        tokenType: tokenType || 'usdc'  // Pass the tokenType to the relayer
      }),
    });

    console.log(`Relayer response status: ${createTransferResponse.status}`);

    if (!createTransferResponse.ok) {
      let errorMessage = "Failed to create transfer with relayer";
      try {
        const errorData = await createTransferResponse.json();
        errorMessage = errorData.error || errorMessage;
        console.error("Relayer error details:", errorData);
      } catch (parseError) {
        console.error("Could not parse relayer error response:", parseError);
      }
      throw new Error(errorMessage);
    }

    const createTransferData = await createTransferResponse.json();
    const serializedTransaction = createTransferData.transactionData;

    // Step 3: Deserialize the transaction to sign it
    const transactionBuffer = Buffer.from(serializedTransaction, 'base64');
    const unsignedTransaction = Transaction.from(transactionBuffer);

    console.log("Received transaction for signing with following instructions:");
    unsignedTransaction.instructions.forEach((instruction, i) => {
      console.log(`- Instruction ${i}: Required signers:`,
        instruction.keys
          .filter(key => key.isSigner)
          .map(key => key.pubkey.toString())
      );
    });

    // Check if the transaction has a blockhash
    if (!unsignedTransaction.recentBlockhash) {
      console.log("Transaction missing blockhash, using a new one");
      const connection = getSolanaConnection();
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      unsignedTransaction.recentBlockhash = blockhash;
    }

    // Make sure fee payer is set
    if (!unsignedTransaction.feePayer) {
      console.log("Transaction missing fee payer, using relayer");
      // We'll assume the relayer is the fee payer
    }

    // Step 4: User signs the transaction (only signing the transfer instruction)
    console.log(`User signing transaction with address: ${keypair.publicKey.toString()}`);
    const messageToSign = unsignedTransaction.serializeMessage();
    const signature = sign.detached(messageToSign, keypair.secretKey);

    // Step 5: Serialize the signed transaction
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

    // Step 6: Submit the signed transaction to the relayer
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

    // Step 7: Update the transaction record with the executed status and signature
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: "executed",
        signature: txSignature,
        executedAt: new Date(),
      },
    });

    // Step 8: Check if this transaction fulfills a payment request
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

    return NextResponse.json(
      {
        success: true,
        signature: txSignature,
        message: "Token transaction sent successfully via relayer",
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
