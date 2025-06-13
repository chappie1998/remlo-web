import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Get the session from NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to cancel a payment request" },
        { status: 401 }
      );
    }

    // Get request data
    const { paymentRequestId } = await req.json();

    if (!paymentRequestId) {
      return NextResponse.json(
        { error: "Payment request ID is required" },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Find the payment request and ensure it belongs to the current user
    const paymentRequest = await (prisma as any).PaymentRequest.findFirst({
      where: {
        id: paymentRequestId,
        creatorId: user.id
      }
    });

    if (!paymentRequest) {
      return NextResponse.json(
        { error: "Payment request not found or you don't have permission to cancel it" },
        { status: 404 }
      );
    }

    // Update the payment request to cancelled status
    const updatedPaymentRequest = await (prisma as any).PaymentRequest.update({
      where: {
        id: paymentRequestId
      },
      data: {
        status: "CANCELLED"
      }
    });

    console.log(`Payment request ${paymentRequestId} cancelled successfully`);

    return NextResponse.json({
      success: true,
      paymentRequest: {
        id: updatedPaymentRequest.id,
        shortId: updatedPaymentRequest.shortId,
        amount: updatedPaymentRequest.amount,
        tokenType: updatedPaymentRequest.tokenType,
        note: updatedPaymentRequest.note,
        status: updatedPaymentRequest.status,
        expiresAt: updatedPaymentRequest.expiresAt,
        createdAt: updatedPaymentRequest.createdAt
      }
    });
  } catch (error) {
    console.error("Error cancelling payment request:", error);
    return NextResponse.json(
      { error: "Failed to cancel payment request", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 