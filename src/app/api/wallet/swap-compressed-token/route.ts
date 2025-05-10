import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { PublicKey } from "@solana/web3.js";
import { isValidPasscode } from "@/lib/utils";
import { isValidSolanaAddress, swapCompressedToken } from "@/lib/solana";
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
    console.log('Handling swap compressed token request');

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
        { error: "You must be signed in to perform a swap" },
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

    // Get swap details and passcode from the request
    const { swapTo, sendAmount, receiveAmount, passcode, backupShare, recoveryShare } = await req.json();

    if (!swapTo || !sendAmount || !receiveAmount) {
      return NextResponse.json(
        { error: "Missing required fields: swapTo, sendAmount, receiveAmount" },
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

    if (!isValidSolanaAddress(swapTo)) {
      return NextResponse.json(
        { error: "Invalid swap address" },
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
      // For this example, we'll only support MPC wallets for swapping
      return NextResponse.json(
        { error: "Swap functionality only supports MPC wallets at this time" },
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

    try {
      // Create PublicKey from the swap address
      const swapToPubkey = new PublicKey(swapTo);
      
      console.log(`Performing swap: sending ${sendAmount} USDC to ${swapTo}, receiving ${receiveAmount} USDS`);
      
      // Perform the swap
      const result = await swapCompressedToken(
        keypair, 
        swapToPubkey,
        Number(sendAmount),
        Number(receiveAmount)
      );
      
      console.log('Swap successful with transaction IDs:', { 
        transferTxId: result.transferTxId,
        mintTxId: result.mintTxId 
      });
      
      // Return success response
      return NextResponse.json(
        { 
          success: true, 
          transferTxId: result.transferTxId,
          mintTxId: result.mintTxId,
          message: `Successfully swapped ${sendAmount} USDC for ${receiveAmount} USDS`
        },
        {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    } catch (error) {
      console.error('Error in swap transaction:', error);
      // Provide more detailed error information
      const errorMessage = error instanceof Error ? error.message : "Failed to perform token swap";
      const errorStack = error instanceof Error ? error.stack : '';
      
      console.error('Error details:', { message: errorMessage, stack: errorStack });
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: JSON.stringify(error, Object.getOwnPropertyNames(error))
        },
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
    console.error('Unexpected error in swap-compressed-token API:', error);
    return NextResponse.json(
      { error: "Internal server error" },
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