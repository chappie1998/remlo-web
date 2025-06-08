import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import prisma from "@/lib/prisma";

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function PATCH(req: NextRequest) {
  try {
    console.log('🔄 Updating Base transaction status');
    
    // Get authenticated user
    const user = await getUserFromRequest(req);
    if (!user?.id) {
      return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
    }

    // Extract data from the request
    const { transactionId, status, txHash, oktoJobId, gasUsed, gasFee } = await req.json();

    if (!transactionId || !status) {
      return NextResponse.json(
        { error: "Missing required fields: transactionId, status" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'failed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Update the Base transaction record
    const updatedTransaction = await prisma.baseTransaction.update({
      where: { 
        id: transactionId,
        userId: user.id, // Ensure user can only update their own transactions
      },
      data: {
        status,
        txHash: txHash || null,
        oktoJobId: oktoJobId || null,
        gasUsed: gasUsed || null,
        gasFee: gasFee || null,
        ...(status === 'confirmed' && { confirmedAt: new Date() }),
      },
    });

    console.log('✅ Base transaction updated:', {
      id: updatedTransaction.id,
      status: updatedTransaction.status,
      txHash: updatedTransaction.txHash,
    });

    return NextResponse.json(
      {
        success: true,
        transaction: {
          id: updatedTransaction.id,
          status: updatedTransaction.status,
          txHash: updatedTransaction.txHash,
          confirmedAt: updatedTransaction.confirmedAt,
        },
        message: "Base transaction updated successfully",
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );

  } catch (error) {
    console.error("❌ Error updating Base transaction:", error);
    
    // Handle specific Prisma errors
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: "Transaction not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update Base transaction" },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );
  }
} 