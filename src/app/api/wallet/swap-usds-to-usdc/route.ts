import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { PublicKey, Transaction } from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress 
} from "@solana/spl-token";
import { sign } from "tweetnacl";

import { 
  SPL_TOKEN_ADDRESS, 
  RELAYER_URL, 
  getSolanaConnection 
} from "@/lib/solana";

import { 
  USDS_PROGRAM_ID, 
  USDS_MINT, 
  CONFIG_ACCOUNT, 
  TREASURY_PDA,
  MINT_AUTHORITY_PDA,
  TREASURY_TOKEN_ACCOUNT,
  SWAP_DISCRIMINATORS,
  encodeU64
} from "@/lib/usds-config";

import { isValidPasscode } from "@/lib/utils";
import { prepareMPCSigningKeypair } from "@/lib/mpc";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

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
    console.log('Handling USDs to USDC swap request');

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
        { error: "You must be signed in to swap tokens" },
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

    // Extract the swap amount and passcode from the request
    const { amount, passcode, backupShare, recoveryShare } = await req.json();

    if (!amount) {
      return NextResponse.json(
        { error: "Missing required field: amount" },
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

    // Create a record of the swap transaction request
    const transaction = await prisma.transaction.create({
      data: {
        txData: JSON.stringify({ 
          amount, 
          swap: "USDS_TO_USDC"
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

    console.log(`Creating USDs to USDC swap: ${amount} tokens (${amountInUnits} units with ${TOKEN_DECIMALS} decimals)`);

    // User token accounts
    const userPublicKey = new PublicKey(user.solanaAddress);
    const usdcMint = new PublicKey(SPL_TOKEN_ADDRESS);
    const userUsdcAddress = await getAssociatedTokenAddress(
      usdcMint,
      userPublicKey
    );
    const userUsdsAddress = await getAssociatedTokenAddress(
      USDS_MINT,
      userPublicKey
    );

    // Create instruction data
    const instructionData = Buffer.concat([
      Buffer.from(SWAP_DISCRIMINATORS.swapUsdsToUsdc),
      encodeU64(amountInUnits)
    ]);

    // Request the transaction from the relayer
    const createSwapResponse = await fetch(`${RELAYER_URL}/api/create-swap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fromAddress: user.solanaAddress,
        swapType: "USDS_TO_USDC",
        amount: amount,
        amountInRawUnits: amountInUnits,
        programId: USDS_PROGRAM_ID.toBase58(),
        accounts: {
          configAccount: CONFIG_ACCOUNT.toBase58(),
          userUsdcAddress: userUsdcAddress.toBase58(),
          userUsdsAddress: userUsdsAddress.toBase58(),
          treasuryPDA: TREASURY_PDA.toBase58(),
          treasuryTokenAccount: TREASURY_TOKEN_ACCOUNT.toBase58(),
          usdsMint: USDS_MINT.toBase58(),
        },
        instructionData: Buffer.from(instructionData).toString('base64')
      }),
    });

    console.log(`Relayer response status: ${createSwapResponse.status}`);

    if (!createSwapResponse.ok) {
      let errorMessage = "Failed to create swap with relayer";
      try {
        const errorData = await createSwapResponse.json();
        errorMessage = errorData.error || errorMessage;
        console.error("Relayer error details:", errorData);
      } catch (parseError) {
        console.error("Could not parse relayer error response:", parseError);
      }
      throw new Error(errorMessage);
    }

    const createSwapData = await createSwapResponse.json();
    const serializedTransaction = createSwapData.transactionData;

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

    // Step 4: User signs the transaction (only signing the swap instruction)
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
      let errorMessage = "Failed to submit swap transaction to relayer";
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

    return NextResponse.json(
      {
        success: true,
        signature: txSignature,
        message: "USDs to USDC swap sent successfully via relayer",
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
    console.error("Error swapping USDs to USDC:", error);

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

    const errorMessage = error instanceof Error ? error.message : "Failed to swap USDs to USDC";
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
  } finally {
    await prisma.$disconnect();
  }
} 