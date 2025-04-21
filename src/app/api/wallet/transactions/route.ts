import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { User, Transaction } from "@/lib/mongodb";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    // Get the current session - pass in the auth options
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "You must be signed in to view your transactions" },
        { status: 401 }
      );
    }

    // Connect to the database
    await connectToDatabase();

    // Get the user's ID
    const user = await User.findOne(
      { email: session.user.email },
      { _id: 1 }
    );

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get the user's transactions
    const transactions = await Transaction.find(
      { userId: user._id },
      {
        _id: 1,
        txData: 1,
        status: 1,
        signature: 1,
        createdAt: 1,
        executedAt: 1,
      }
    ).sort({ createdAt: -1 });  // desc order

    // Transform transactions to match expected format
    const formattedTransactions = transactions.map(tx => ({
      id: tx._id.toString(),
      txData: tx.txData,
      status: tx.status,
      signature: tx.signature,
      createdAt: tx.createdAt,
      executedAt: tx.executedAt,
    }));

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
