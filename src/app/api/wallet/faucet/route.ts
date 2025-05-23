import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { SPL_TOKEN_ADDRESS, RELAYER_URL } from "@/lib/solana";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getUserFromRequest } from "@/lib/jwt";

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
  const startTime = Date.now();
  
  try {
    console.log('Handling faucet request');

    // Use optimized JWT authentication
    const user = await getUserFromRequest(req);
    
    if (!user) {
      console.log('No valid user session found, returning 401');
      return NextResponse.json(
        { error: "You must be signed in to use the faucet" },
        { status: 401 }
      );
    }

    console.log(`⚡ Authentication completed in ${Date.now() - startTime}ms`);
    console.log('Found user email from JWT:', user.email);

    if (!user.solanaAddress) {
      return NextResponse.json(
        { error: "Wallet not set up" },
        { status: 400 }
      );
    }

    // Check user's current USDC balance directly
    // Instead of calling token-balance API which requires auth
    const solanaEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(solanaEndpoint, "confirmed");
    
    const userPublicKey = new PublicKey(user.solanaAddress);
    const tokenMint = new PublicKey(SPL_TOKEN_ADDRESS);
    
    let currentBalance = 0;
    
    try {
      // Get the associated token account address
      const associatedTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        userPublicKey,
        false, // allowOwnerOffCurve
        TOKEN_PROGRAM_ID
      );

      // Check if the token account exists and get balance
      const tokenAccountInfo = await connection.getAccountInfo(associatedTokenAccount);
      
      if (tokenAccountInfo) {
        const balance = await connection.getTokenAccountBalance(associatedTokenAccount);
        currentBalance = balance.value.uiAmount || 0;
        console.log(`Current USDC balance: ${currentBalance}`);
      } else {
        console.log("No USDC token account found, balance is 0");
      }
    } catch (error) {
      console.error("Error checking USDC balance:", error);
      // Continue with 0 balance assumption
    }

    console.log(`Current USDC balance: ${currentBalance}`);

    // Check if user already has enough USDC (optional limit)
    const FAUCET_LIMIT = 1000; // 1000 USDC limit
    if (currentBalance >= FAUCET_LIMIT) {
      return NextResponse.json(
        { 
          error: `You already have ${currentBalance} USDC. Faucet limit is ${FAUCET_LIMIT} USDC.`,
          currentBalance
        },
        { status: 400 }
      );
    }

    // Call the relayer to fund the user's wallet
    const relayerResponse = await fetch(`${RELAYER_URL}/api/faucet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress: user.solanaAddress,
      }),
    });

    console.log(`Relayer faucet response status: ${relayerResponse.status}`);

    if (!relayerResponse.ok) {
      const errorText = await relayerResponse.text();
      console.error("Relayer error:", errorText);
      return NextResponse.json(
        { error: "Failed to fund wallet", details: errorText },
        { status: 500 }
      );
    }

    const result = await relayerResponse.json();

    console.log(`✅ Total API request time: ${Date.now() - startTime}ms (Auth: JWT)`);

    return NextResponse.json(
      { 
        success: true, 
        message: "Wallet funded successfully",
        transactionSignature: result.signature || null,
        previousBalance: currentBalance,
        ...result 
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
    console.error("Error in faucet endpoint:", error);
    console.log(`❌ Faucet error in ${Date.now() - startTime}ms`);
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