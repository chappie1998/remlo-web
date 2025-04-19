import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { isRelayerInitialized, getRelayerPublicKey, getRelayerBalance } from "@/lib/relayer";

export async function GET(req: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession();

    // Check if user is authenticated
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "You must be signed in to check relayer status" },
        { status: 401 }
      );
    }

    // Check if the relayer is initialized
    if (!isRelayerInitialized()) {
      return NextResponse.json({
        initialized: false,
        message: "Relayer not initialized",
      });
    }

    // Get the relayer's public key
    const publicKey = getRelayerPublicKey();

    // Get the relayer's balance
    const balance = await getRelayerBalance();

    return NextResponse.json({
      initialized: true,
      publicKey,
      balance: balance?.balanceInLamports || 0,
      formattedBalance: balance?.balanceInSol || "0",
    });
  } catch (error) {
    console.error("Error checking relayer status:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to check relayer status";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
