import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, db } from "@/lib/auth";
import { verifyPasscode } from "@/lib/wallet";

// Token addresses (devnet)
const USDC_TOKEN_ADDRESS = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
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
    const { fromToken, toToken, amount, passcode } = await req.json();

    // Validate inputs
    if (!fromToken || !toToken || !amount || !passcode) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // In a real implementation, this would execute the swap transaction
    // For this demo, we'll just create a transaction record

    // Swap data (in a real app this would use actual blockchain transactions)
    const swapData = {
      type: "swap",
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: amount, // 1:1 ratio for simplicity
      timestamp: new Date().toISOString(),
    };

    // Save transaction record
    const transaction = await db.transaction.create({
      data: {
        userId: session.user.id,
        txData: JSON.stringify(swapData),
        status: "executed", // In a real app this would start as "pending"
        signature: `mock_swap_${Date.now()}`, // In a real app this would be the actual tx signature
        executedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        status: transaction.status,
      },
    });

  } catch (error) {
    console.error("Error processing swap:", error);
    return NextResponse.json(
      { error: "Failed to process swap" },
      { status: 500 }
    );
  }
}
