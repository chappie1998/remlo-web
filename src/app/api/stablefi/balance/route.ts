import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTokenBalance } from "@/lib/solana";

// Mock StableFi token address (for devnet)
const STABLEFI_TOKEN_ADDRESS = "DK6BeXANcJbG9wezEL6Au7RxJWBWHp6tgYGDQs3aRa6E";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.solanaAddress) {
      return NextResponse.json(
        { error: "Not authenticated or missing wallet address" },
        { status: 401 }
      );
    }

    // On a real implementation, this would call the actual StableFi token address
    // For this demo, we'll return a mock balance based on the token address
    const balance = await getTokenBalance(
      session.user.solanaAddress,
      STABLEFI_TOKEN_ADDRESS
    );

    // Format the balance to 2 decimal places
    const formattedBalance = balance ? (balance / 1_000_000).toFixed(2) : "0.00";

    return NextResponse.json({
      success: true,
      balance: formattedBalance,
    });
  } catch (error) {
    console.error("Error fetching StableFi balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch StableFi balance" },
      { status: 500 }
    );
  }
}
