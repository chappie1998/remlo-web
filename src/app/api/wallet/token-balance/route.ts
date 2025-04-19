import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { getTokenBalance, getMultipleTokenBalances, DEVNET_TEST_TOKENS } from "@/lib/token";

export async function GET(req: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "You must be signed in to get token balances" },
        { status: 401 }
      );
    }

    // Check if a solana address is assigned to the user
    if (!session.user.solanaAddress) {
      return NextResponse.json(
        { error: "Wallet not set up" },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const tokenMint = url.searchParams.get("tokenMint");

    if (tokenMint) {
      // Get a single token balance
      const balance = await getTokenBalance(tokenMint, session.user.solanaAddress);

      return NextResponse.json({
        success: true,
        tokenMint,
        balance: balance.tokenAmount,
        formattedBalance: balance.formattedAmount,
      });
    } else {
      // Get all token balances for predefined tokens
      const tokenMints = DEVNET_TEST_TOKENS.map(token => token.address);
      const balances = await getMultipleTokenBalances(tokenMints, session.user.solanaAddress);

      // Format the result with token information
      const result = DEVNET_TEST_TOKENS.map(token => {
        const balance = balances[token.address] || { tokenAmount: 0, formattedAmount: '0' };
        return {
          ...token,
          balance: balance.tokenAmount,
          formattedBalance: balance.formattedAmount,
        };
      });

      return NextResponse.json({
        success: true,
        tokens: result,
      });
    }
  } catch (error) {
    console.error("Error fetching token balance:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch token balance";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
