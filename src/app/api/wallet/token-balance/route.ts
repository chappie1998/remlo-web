import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { RELAYER_URL } from "@/lib/solana";
import { authOptions } from "@/lib/auth";
import { fetchSplTokenBalance } from "@/lib/solana";
import { User } from "@/lib/mongodb";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "You must be signed in to view your balance" },
        { status: 401 }
      );
    }

    // Connect to the database
    await connectToDatabase();

    // Get the user's wallet address
    const user = await User.findOne(
      { email: session.user.email },
      { solanaAddress: 1 }
    );

    if (!user || !user.solanaAddress) {
      return NextResponse.json(
        { error: "Wallet not set up" },
        { status: 400 }
      );
    }

    try {
      // First, try to fetch the token balance directly using our utility function
      const { balance, formattedBalance } = await fetchSplTokenBalance(user.solanaAddress);

      return NextResponse.json({
        address: user.solanaAddress,
        balance,
        formattedBalance,
      });
    } catch (error) {
      console.error("Error fetching token balance directly:", error);

      // Fallback: try to fetch from the relayer
      try {
        const response = await fetch(`${RELAYER_URL}/api/token-balance/${user.solanaAddress}`);

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({
            address: user.solanaAddress,
            balance: data.balance,
            formattedBalance: data.formattedBalance,
          });
        } else {
          const error = await response.json();
          throw new Error(error.error || "Failed to fetch token balance from relayer");
        }
      } catch (relayerError) {
        console.error("Error fetching from relayer:", relayerError);

        // If both methods fail, return a default response with zero balance
        return NextResponse.json({
          address: user.solanaAddress,
          balance: 0,
          formattedBalance: "0.000000000",
          error: "Failed to fetch token balance",
        });
      }
    }
  } catch (error) {
    console.error("Error fetching token balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch token balance" },
      { status: 500 }
    );
  }
}
