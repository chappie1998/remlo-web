import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { fetchAccountBalance } from "@/lib/solana";
import { authOptions } from "@/lib/auth";
import { User } from "@/lib/mongodb";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    // Get the current session - pass in the auth options
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

    // Fetch the balance
    const { balanceInLamports, balanceInSol } = await fetchAccountBalance(user.solanaAddress);

    return NextResponse.json({
      success: true,
      balance: balanceInLamports,
      formattedBalance: balanceInSol,
    });
  } catch (error) {
    console.error("Error fetching balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    );
  }
}
