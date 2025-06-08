import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import prisma from "@/lib/prisma";

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Checking Base transaction status');
    
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
    }

    // Get transaction ID from query parameters
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    // Get transaction record
    const transaction = await prisma.baseTransaction.findFirst({
      where: {
        id: transactionId,
        userId: user.id,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Return current transaction status
    // Note: In a production implementation, you would query Okto's API
    // to get the real-time status using the oktoJobId
    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        tokenSymbol: transaction.tokenSymbol,
        recipientAddress: transaction.recipientAddress,
        recipientUsername: transaction.recipientUsername,
        txHash: transaction.txHash,
        oktoJobId: transaction.oktoJobId,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    });

  } catch (error) {
    console.error("❌ Error checking Base transaction:", error);
    return NextResponse.json(
      { error: "Failed to check transaction status" },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );
  }
} 