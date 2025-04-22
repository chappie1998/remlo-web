import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTokenBalance } from "@/lib/solana";

// USDC token address (for devnet)
const USDC_TOKEN_ADDRESS = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.solanaAddress) {
      return NextResponse.json(
        { error: "Not authenticated or missing wallet address" },
        { status: 401 }
      );
    }

    // Fetch the USDC token balance
    const balance = await getTokenBalance(
      session.user.solanaAddress,
      USDC_TOKEN_ADDRESS
    );

    // Format the balance to 2 decimal places (USDC has 6 decimals)
    const formattedBalance = balance ? (balance / 1_000_000).toFixed(2) : "0.00";

    return NextResponse.json({
      success: true,
      balance: formattedBalance,
    });
  } catch (error) {
    console.error("Error fetching USDC balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch USDC balance" },
      { status: 500 }
    );
  }
}
