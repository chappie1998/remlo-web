import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { fetchAccountBalance } from "@/lib/solana";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

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

    // Get the user's wallet address
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { solanaAddress: true },
    });

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
