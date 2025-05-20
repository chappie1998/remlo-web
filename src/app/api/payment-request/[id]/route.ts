import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// Remove global prisma instance
// const prisma = new PrismaClient();

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

// Fixed for Next.js 15 - using proper parameter handling
export async function GET(request: NextRequest, context: any) {
  const prisma = new PrismaClient(); // Instantiate Prisma Client here
  try {
    // Extract the ID without accessing params.id directly
    const segments = request.nextUrl.pathname.split('/');
    const requestId = segments[segments.length - 1];
    
    console.log(`Fetching payment request with ID: ${requestId}`);
    
    if (!requestId) {
      return NextResponse.json(
        { error: "Payment request ID is required" },
        { status: 400 }
      );
    }

    console.log(`Using Prisma to find payment request with shortId: ${requestId}`);
    
    // Try both ways to find the payment request
    let paymentRequest;
    try {
      // First try to find by shortId
      paymentRequest = await (prisma as any).PaymentRequest.findFirst({
        where: { 
          OR: [
            { shortId: requestId },
            { id: requestId }
          ]
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              solanaAddress: true,
            }
          }
        }
      });
    } catch (e) {
      console.error("Prisma query error:", e);
      throw e;
    }

    console.log(`Payment request found:`, paymentRequest ? "Yes" : "No");

    if (!paymentRequest) {
      return NextResponse.json(
        { error: "Payment request not found" },
        { status: 404 }
      );
    }

    // Construct response with creator info
    const response = {
      id: paymentRequest.id,
      shortId: paymentRequest.shortId,
      amount: paymentRequest.amount,
      tokenType: paymentRequest.tokenType,
      note: paymentRequest.note,
      status: paymentRequest.status.toLowerCase(),
      expiresAt: paymentRequest.expiresAt,
      createdAt: paymentRequest.createdAt,
      requesterAddress: paymentRequest.creator.solanaAddress || "",
      requesterName: paymentRequest.creator.name || "",
      requesterEmail: paymentRequest.creator.email || "",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching payment request:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment request", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 