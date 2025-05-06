import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { sendTransaction } from "@/lib/wallet";
import { isValidPasscode } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";
import { decryptMnemonic, getKeypairFromMnemonic } from "@/lib/crypto";
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
    console.log('Handling transaction request');

    // First, try to get the session from NextAuth
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      userEmail = session.user.email;
      console.log('Found user email from NextAuth session:', userEmail);
    }

    // If no NextAuth session, try to get the user from the Authorization header
    if (!userEmail) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log('Extracted token:', token);

        // Find the session in the database
        const dbSession = await prisma.session.findUnique({
          where: { sessionToken: token },
          include: { user: true }
        });

        if (dbSession?.user?.email && dbSession.expires > new Date()) {
          userEmail = dbSession.user.email;
          console.log('Found user email from session token:', userEmail);
        }
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: "You must be signed in to send transactions" },
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

    // Extract data from the request
    const { to, amount, passcode, username } = await req.json();

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
        encryptedKeypair: true,
        solanaAddress: true,
        usesMPC: true,
        mpcServerShare: true,
        mpcSalt: true,
        mpcBackupShare: true
      },
    });

    if (!user || !user.solanaAddress) {
      return NextResponse.json(
        { error: "Wallet not found" },
        {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    if (!user.mpcServerShare || !user.mpcSalt) {
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

    // Code to generate the keypair from MPC shares
    const keypair = await prepareMPCSigningKeypair(user.mpcSalt, passcode, user.mpcServerShare);
    if (!keypair) {
      return NextResponse.json(
        { error: "Failed to derive wallet from passcode" },
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

    // Verify the generated keypair matches the user's address
    const keypairAddress = keypair.publicKey.toString();
    console.log(`Generated keypair address: ${keypairAddress}`);
    console.log(`User's stored address: ${user.solanaAddress}`);

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

    // Convert amount to lamports
    const amountInLamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
    console.log(`Amount in lamports: ${amountInLamports}`);

    if (Number.isNaN(amountInLamports) || amountInLamports <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
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

    // Create transaction data object, including username if available
    const txData = username 
      ? JSON.stringify({ to, amount, username }) 
      : JSON.stringify({ to, amount });

    // Create a record of the transaction request
    const transaction = await prisma.transaction.create({
      data: {
        txData,
        status: "pending",
        user: {
          connect: { id: user.id }
        }
      },
    });

    // Send the transaction
    try {
      const { signature } = await sendTransaction(keypair, to, amountInLamports);

      // Update the transaction record with the executed status and signature
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "executed",
          signature,
          executedAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          success: true,
          signature,
          message: "Transaction sent successfully",
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
      console.error("Error sending transaction:", error);

      // Update the transaction record with the failed status
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "failed",
        },
      });

      return NextResponse.json(
        { error: "Failed to send transaction" },
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
  } catch (error) {
    console.error("Error in send-transaction API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
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
