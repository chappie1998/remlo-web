import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { BASE_CONFIG, parseBaseAmount, isValidBaseAddress } from "@/lib/base-config";
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
    console.log('🚀 Handling Base transfer request');
    
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
    }

    // Extract data from the request
    const { to, amount, tokenSymbol, username } = await req.json();

    if (!to || !amount || !tokenSymbol) {
      return NextResponse.json(
        { error: "Missing required fields: to, amount, tokenSymbol" },
        { status: 400 }
      );
    }

    // Validate Base address
    if (!isValidBaseAddress(to)) {
      return NextResponse.json(
        { error: "Invalid recipient Base address" },
        { status: 400 }
      );
    }

    // Validate token symbol
    const supportedTokens = ['USDC', 'ETH'];
    if (!supportedTokens.includes(tokenSymbol.toUpperCase())) {
      return NextResponse.json(
        { error: `Unsupported token: ${tokenSymbol}. Supported tokens: ${supportedTokens.join(', ')}` },
        { status: 400 }
      );
    }

    // Get user's Base wallet information
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        baseAddress: true,
        oktoUserId: true,
        hasOktoWallet: true,
      },
    });

    if (!userRecord || !userRecord.baseAddress || !userRecord.hasOktoWallet) {
      return NextResponse.json(
        { error: "Base wallet not found. Please set up your universal wallet first." },
        { status: 404 }
      );
    }

    // Get token configuration
    const tokenConfig = BASE_CONFIG.TOKENS[tokenSymbol.toUpperCase() as keyof typeof BASE_CONFIG.TOKENS];
    if (!tokenConfig) {
      return NextResponse.json(
        { error: `Token configuration not found for ${tokenSymbol}` },
        { status: 400 }
      );
    }

    // Parse amount to smallest unit
    const amountInSmallestUnit = parseBaseAmount(amount, tokenConfig.decimals);

    // Create transaction data object
    const txData = username 
      ? JSON.stringify({ to, amount, tokenSymbol, username, blockchain: 'base' }) 
      : JSON.stringify({ to, amount, tokenSymbol, blockchain: 'base' });

    // Create a Base transaction record
    const transaction = await prisma.baseTransaction.create({
      data: {
        userId: userRecord.id,
        amount: amount,
        tokenSymbol: tokenSymbol.toUpperCase(),
        tokenAddress: tokenConfig.address || null,
        tokenDecimals: tokenConfig.decimals,
        recipientAddress: to,
        recipientUsername: username || null,
        senderAddress: userRecord.baseAddress,
        status: "pending",
        network: "base-sepolia",
        transactionType: "transfer",
      },
    });

    // Prepare transfer parameters for Okto SDK
    const transferParams = {
      amount: amountInSmallestUnit,
      recipient: to as `0x${string}`,
      token: tokenConfig.address ? (tokenConfig.address as `0x${string}`) : null,
      caip2Id: BASE_CONFIG.NETWORK.caip2Id,
    };

    console.log('📤 Preparing Okto transfer:', {
      amount: transferParams.amount.toString(),
      recipient: transferParams.recipient,
      token: transferParams.token,
      tokenSymbol,
      caip2Id: transferParams.caip2Id,
    });

    // For now, return the transfer parameters so the frontend can execute with Okto SDK
    // In a full implementation, you'd execute the transfer here using server-side Okto SDK
    return NextResponse.json(
      {
        success: true,
        transactionId: transaction.id,
        transferParams: {
          amount: transferParams.amount.toString(),
          recipient: transferParams.recipient,
          token: transferParams.token,
          caip2Id: transferParams.caip2Id,
        },
        message: `${tokenSymbol} transfer prepared successfully`,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error in Base transfer API:", error);
    return NextResponse.json(
      { error: "Failed to prepare Base transfer" },
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