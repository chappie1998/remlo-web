import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { SPL_TOKEN_ADDRESS, RELAYER_URL } from "@/lib/solana";
import { authOptions } from "@/lib/auth";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

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
    console.log('Handling faucet request');

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
        { error: "You must be signed in to use the faucet" },
        { status: 401 }
      );
    }

    // Get the user's wallet information
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        solanaAddress: true,
      },
    });

    if (!user || !user.solanaAddress) {
      return NextResponse.json(
        { error: "Wallet not set up" },
        { status: 400 }
      );
    }

    // Check user's current USDC balance directly
    // Instead of calling token-balance API which requires auth
    const solanaEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(solanaEndpoint);
    
    // Get the user's USDC token account address
    const userPublicKey = new PublicKey(user.solanaAddress);
    const tokenMint = new PublicKey(SPL_TOKEN_ADDRESS);
    const tokenAccount = await getAssociatedTokenAddress(tokenMint, userPublicKey);
    
    // Check if token account exists and get balance
    let usdcBalance = 0;
    try {
      const accountInfo = await connection.getAccountInfo(tokenAccount);
      if (accountInfo) {
        // Instead of manually parsing token account data, use getTokenAccountBalance API
        // which handles parsing correctly
        const tokenAmount = await connection.getTokenAccountBalance(tokenAccount);
        usdcBalance = Number(tokenAmount.value.uiAmount || 0);
        console.log(`USDC token account found with balance: ${usdcBalance}`);
      } else {
        console.log(`No USDC token account found, balance is 0`);
      }
    } catch (error) {
      console.log("Error checking token balance:", error);
      // If we can't check, assume 0 and let the faucet proceed
      usdcBalance = 0;
    }
    
    console.log(`Current USDC balance: ${usdcBalance}`);

    // Check if balance is less than 1 USDC
    if (usdcBalance >= 2) {
      return NextResponse.json(
        { error: "Faucet is only available for users with less than 1 USDC", balance: usdcBalance },
        { status: 400 }
      );
    }

    // Request tokens from the relayer
    const faucetResponse = await fetch(`${RELAYER_URL}/api/faucet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipientAddress: user.solanaAddress,
        amount: 10, // 2 USDC
      }),
    });

    console.log(`Relayer faucet response status: ${faucetResponse.status}`);

    if (!faucetResponse.ok) {
      let errorMessage = "Failed to request tokens from faucet";
      try {
        const errorData = await faucetResponse.json();
        errorMessage = errorData.error || errorMessage;
        console.error("Relayer error details:", errorData);
      } catch (parseError) {
        console.error("Could not parse relayer error response:", parseError);
      }
      throw new Error(errorMessage);
    }

    const faucetData = await faucetResponse.json();

    // Create a record of the faucet transaction
    await prisma.transaction.create({
      data: {
        txData: JSON.stringify({ 
          type: "faucet", 
          amount: 10, 
          token: SPL_TOKEN_ADDRESS 
        }),
        status: "executed",
        signature: faucetData.signature,
        executedAt: new Date(),
        user: {
          connect: { id: user.id }
        }
      },
    });

    return NextResponse.json({
      success: true,
      signature: faucetData.signature,
      message: "2 USDC tokens sent to your wallet",
    });
  } catch (error) {
    console.error("Error processing faucet request:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to process faucet request";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 