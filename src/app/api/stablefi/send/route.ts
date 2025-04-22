import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, db } from "@/lib/auth";
import { verifyPasscode } from "@/lib/wallet";
import { isValidSolanaAddress } from "@/lib/solana";

// StableFi token address (devnet)
const STABLEFI_TOKEN_ADDRESS = "DK6BeXANcJbG9wezEL6Au7RxJWBWHp6tgYGDQs3aRa6E";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Parse the request
    const { to, amount, passcode } = await req.json();

    // Validate inputs
    if (!to || !amount || !passcode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!isValidSolanaAddress(to)) {
      return NextResponse.json(
        { error: "Invalid recipient address" },
        { status: 400 }
      );
    }

    // Verify passcode
    const isValid = await verifyPasscode(session.user.id, passcode);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid passcode" },
        { status: 401 }
      );
    }

    // In a real implementation, this would execute the token transfer on-chain
    // For this demo, we'll create a transaction record

    // Transaction data
    const sendData = {
      type: "send",
      token: "STABLEFI",
      tokenAddress: STABLEFI_TOKEN_ADDRESS,
      amount,
      to,
      timestamp: new Date().toISOString(),
    };

    // Save transaction record
    const transaction = await db.transaction.create({
      data: {
        userId: session.user.id,
        txData: JSON.stringify(sendData),
        status: "executed", // In a real app this would start as "pending"
        signature: `mock_send_${Date.now()}`, // In a real app this would be the actual tx signature
        executedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        status: transaction.status,
        signature: transaction.signature,
      },
    });

  } catch (error) {
    console.error("Error processing token send:", error);
    return NextResponse.json(
      { error: "Failed to process token transfer" },
      { status: 500 }
    );
  }
}
