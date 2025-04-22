import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, db } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get transactions for the user, sorted by most recent first
    const transactions = await db.transaction.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10, // Limit to 10 most recent transactions
    });

    // Format transactions for the client
    const formattedTransactions = transactions.map((tx) => {
      const txData = JSON.parse(tx.txData);
      // Add a type field if it doesn't exist (for backward compatibility)
      if (!txData.type) {
        if (txData.token === "STABLEFI") {
          txData.type = "send";
        } else if (txData.fromToken && txData.toToken) {
          txData.type = "swap";
        } else {
          txData.type = "unknown";
        }
      }

      return {
        id: tx.id,
        status: tx.status,
        signature: tx.signature,
        createdAt: tx.createdAt.toISOString(),
        executedAt: tx.executedAt?.toISOString(),
        txData: JSON.stringify(txData),
      };
    });

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
