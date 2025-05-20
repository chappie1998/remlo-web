import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
// import prisma from "@/lib/prisma"; // Use local instance instead
import { PrismaClient } from "@prisma/client";

export async function POST(req: NextRequest) {
  const prisma = new PrismaClient(); // Instantiate here
  try {
    // Get the session from NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to complete a payment" },
        { status: 401 }
      );
    }

    // Get request data
    const { paymentRequestId, transactionSignature } = await req.json();

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

    // Find the payment request
    const paymentRequest = await (prisma as any).PaymentRequest.findFirst({
      where: {
        shortId: paymentRequestId
      }
    });

    if (!paymentRequest) {
      return NextResponse.json(
        { error: "Payment request not found" },
        { status: 404 }
      );
    }

    // Check if the payment request is still pending
    if (paymentRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: `Payment request is already ${paymentRequest.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Create a payment record and update payment request status
    const payment = await (prisma as any).Payment.create({
      data: {
        payerId: user.id,
        paymentRequestId: paymentRequest.id,
        transactionSignature: transactionSignature || null,
        status: "CONFIRMED"
      }
    });

    // Update the payment request status to completed
    const updatedPaymentRequest = await (prisma as any).PaymentRequest.update({
      where: {
        id: paymentRequest.id
      },
      data: {
        status: "COMPLETED"
      }
    });

    console.log(`Payment request ${paymentRequestId} completed successfully`);

    return NextResponse.json({
      success: true,
      paymentRequest: {
        id: updatedPaymentRequest.id,
        shortId: updatedPaymentRequest.shortId,
        amount: updatedPaymentRequest.amount,
        tokenType: updatedPaymentRequest.tokenType,
        note: updatedPaymentRequest.note,
        status: updatedPaymentRequest.status,
        createdAt: updatedPaymentRequest.createdAt
      }
    });
  } catch (error) {
    console.error("Error completing payment request:", error);
    return NextResponse.json(
      { error: "Failed to complete payment request", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 