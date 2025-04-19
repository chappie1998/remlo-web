import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Get the current session - pass in the auth options
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "You must be signed in to view your token balance" },
        { status: 401 }
      );
    }

    // Check if the user has a Solana address
    if (!session.user.solanaAddress) {
      return NextResponse.json(
        { error: "No wallet address found. Please set up your wallet first." },
        { status: 400 }
      );
    }

    // Return mock token balance
    return NextResponse.json({
      address: session.user.solanaAddress,
      balance: 1000000000, // 1 token with 9 decimals
      formattedBalance: "1.000000000",
    });
  } catch (error) {
    console.error("Error fetching token balance:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch token balance";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
