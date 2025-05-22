import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { generatePaymentLink } from "@/lib/paymentLinkUtils";

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
    console.log('Handling activity overview request');

    // Get the session from NextAuth (single lookup)
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('No valid user session found, returning 401');
      return NextResponse.json(
        { error: "You must be signed in to view your activity" },
        {
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Get the user data (single database query)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Pagination params
    const url = req.nextUrl;
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const includeCounts = url.searchParams.get('includeCounts') === 'true';

    // Fetch all data in parallel with optimized queries
    const [
      transactions,
      createdRequests,
      receivedRequests,
      transactionCount,
      createdCount,
      receivedCount
    ] = await Promise.all([
      // Transactions
      prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          txData: true,
          status: true,
          signature: true,
          createdAt: true,
          executedAt: true,
        },
        take: limit,
        skip: offset,
      }),
      
      // Payment requests created by user
      prisma.paymentRequest.findMany({
        where: { creatorId: user.id },
        select: {
          id: true,
          shortId: true,
          amount: true,
          tokenType: true,
          note: true,
          status: true,
          expiresAt: true,
          createdAt: true,
          recipient: {
            select: {
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      
      // Payment requests received by user
      prisma.paymentRequest.findMany({
        where: { recipientId: user.id },
        select: {
          id: true,
          shortId: true,
          amount: true,
          tokenType: true,
          note: true,
          status: true,
          expiresAt: true,
          createdAt: true,
          creator: {
            select: {
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      
      // Count queries (only run if needed)
      includeCounts ? prisma.transaction.count({ where: { userId: user.id } }) : Promise.resolve(0),
      includeCounts ? prisma.paymentRequest.count({ where: { creatorId: user.id } }) : Promise.resolve(0),
      includeCounts ? prisma.paymentRequest.count({ where: { recipientId: user.id } }) : Promise.resolve(0)
    ]);

    // Format payment requests
    const formattedCreated = createdRequests.map((pr: any) => ({
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
    }));

    const formattedReceived = receivedRequests.map((pr: any) => ({
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
    }));

    // Combine and sort all payment requests
    const allPaymentRequests = [...formattedCreated, ...formattedReceived]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Check if cache busting is requested
    const isCacheBust = req.nextUrl.searchParams.has('t');

    return NextResponse.json(
      {
        success: true,
        transactions: transactions || [],
        paymentRequests: allPaymentRequests,
        ...(includeCounts && {
          totals: {
            transactions: transactionCount,
            createdRequests: createdCount,
            receivedRequests: receivedCount
          }
        }),
        limit,
        offset,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
          // Use different cache control based on whether this is a cache-busting request
          'Cache-Control': isCacheBust 
            ? 'no-cache, no-store, must-revalidate' 
            : 'public, max-age=30, s-maxage=30', // Cache for 30 seconds
          ...(isCacheBust && {
            'Pragma': 'no-cache',
            'Expires': '0'
          }),
        }
      }
    );
  } catch (error) {
    console.error("Error fetching activity overview:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity overview" },
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