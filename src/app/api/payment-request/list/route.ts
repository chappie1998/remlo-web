import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { generatePaymentLink } from "@/lib/config";

// const prisma = new PrismaClient(); // Removed global instance

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
  const prisma = new PrismaClient(); // Instantiate here
  try {
    // Get the session from NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to list payment requests" },
        { status: 401 }
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

    // List all payment requests created by this user - without using transaction
    const createdRequests = await (prisma as any).PaymentRequest.findMany({
      where: {
        creatorId: user.id
      },
      include: {
        recipient: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // List all payment requests where this user is the recipient - without using transaction
    const receivedRequests = await (prisma as any).PaymentRequest.findMany({
      where: {
        recipientId: user.id
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${createdRequests.length} created payment requests and ${receivedRequests.length} received payment requests for user`);

    // Count records for debugging - without using transaction
    const count = await (prisma as any).PaymentRequest.count();
    console.log("Total payment requests in database:", count);

    // Combine the requests and format them
    const allPaymentRequests = [
      ...createdRequests.map((pr: any) => ({
        id: pr.id,
        shortId: pr.shortId,
        amount: pr.amount,
        tokenType: pr.tokenType,
        note: pr.note,
        status: pr.status,
        expiresAt: pr.expiresAt,
        createdAt: pr.createdAt,
        link: generatePaymentLink(pr.shortId, req),
        type: 'created',
        recipientUsername: pr.recipient?.username || null,
        recipientEmail: pr.recipient?.email || null
      })),
      ...receivedRequests.map((pr: any) => ({
        id: pr.id,
        shortId: pr.shortId,
        amount: pr.amount,
        tokenType: pr.tokenType,
        note: pr.note,
        status: pr.status,
        expiresAt: pr.expiresAt,
        createdAt: pr.createdAt,
        link: generatePaymentLink(pr.shortId, req),
        type: 'received',
        requesterUsername: pr.creator?.username || null,
        requesterEmail: pr.creator?.email || null
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      paymentRequests: allPaymentRequests
    });
  } catch (error) {
    console.error("Error listing payment requests:", error);
    return NextResponse.json(
      { error: "Failed to list payment requests", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 