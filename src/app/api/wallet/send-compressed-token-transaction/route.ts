import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { sendTransaction } from "@/lib/wallet";
import { isValidPasscode } from "@/lib/utils";
import { isValidSolanaAddress, simpleCompressedTransfer } from "@/lib/solana";
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
    console.log('Handling send transaction request');

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

    // Get transaction details and passcode from the request
    const { to, amount, passcode, backupShare, recoveryShare } = await req.json();

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

    // Determine which type of wallet the user has (MPC or legacy)
    let keypair;

    if (user.usesMPC) {
      // MPC wallet approach
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

      // If the client provided their own backup and recovery shares, use those
      // Otherwise, use the server's stored backup share for 3-part reconstruction
      const clientBackupShare = backupShare || user.mpcBackupShare;

      console.log(`Attempting MPC signing with ${clientBackupShare ? 'backup share' : 'no backup share'}`);

      // Prepare the keypair using MPC with 3 shares
      try {
        keypair = prepareMPCSigningKeypair(
          passcode,
          user.mpcServerShare,
          user.mpcSalt,
          clientBackupShare,
          recoveryShare // This might be undefined, which is fine
        );

        if (!keypair) {
          console.error("MPC signing preparation returned null");
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
          console.error(`Address mismatch: expected ${user.solanaAddress}, got ${keypairAddress}`);
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
      } catch (mpError) {
        console.error("Error in MPC signing preparation:", mpError);
        return NextResponse.json(
          { error: mpError instanceof Error ? mpError.message : "Failed to prepare MPC signing" },
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
    } else {
      // Legacy approach with encrypted mnemonic
      if (!user.encryptedKeypair) {
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

      // Decrypt the mnemonic with the provided passcode
      const mnemonic = await decryptMnemonic(user.encryptedKeypair, passcode);

      if (!mnemonic) {
        return NextResponse.json(
          { error: "Invalid passcode" },
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

      // Derive the keypair from the mnemonic
      keypair = getKeypairFromMnemonic(mnemonic);
    }

    if (Number.isNaN(amount) || amount <= 0) {
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

    // Create a record of the transaction request
    const transaction = await prisma.transaction.create({
      data: {
        txData: JSON.stringify({ to, amount }),
        status: "pending",
        user: {
          connect: { id: user.id }
        }
      },
    });

    // Send the transaction
    try {
      // const { signature } = await sendTransaction(keypair, to, amountInLamports);
      const signature = "signature"
      await simpleCompressedTransfer(keypair, to, amount)
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
    } catch (txError) {
      // Update the transaction record with the rejected status
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "rejected",
        },
      });

      console.error("Transaction failed:", txError);
      const errorMessage = txError instanceof Error ? txError.message : "Transaction failed to execute";
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
  } catch (error) {
    console.error("Error sending transaction:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send transaction";
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
    // Close the Prisma client connection
    await prisma.$disconnect();
  }
}
