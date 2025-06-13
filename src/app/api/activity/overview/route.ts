import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generatePaymentLink } from "@/lib/paymentLinkUtils";
import { getUserFromRequest } from "@/lib/jwt";

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
  const startTime = Date.now();

  try {
    console.log('Handling activity overview request');

    // Use optimized JWT authentication
    const userData = await getUserFromRequest(req);
    if (!userData) {
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

    // Get user with Solana address for transaction queries
    const user = await prisma.user.findUnique({
      where: { email: userData.email },
      select: { 
        id: true, 
        solanaAddress: true 
      },
    });

    if (!user || !user.solanaAddress) {
      return NextResponse.json(
        { error: "User not found or wallet not set up" },
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

    const authTime = Date.now() - startTime;
    console.log(`⚡ Authentication completed in ${authTime}ms`);

    // Use optimized queries - fewer queries and better indexing
    const [
      transactions,
      createdRequests,
      receivedRequests,
      counts
    ] = await Promise.all([
      // Transactions with minimal select - SAME QUERY AS HOMEPAGE
      prisma.transaction.findMany({
        where: {
          OR: [
            // Transactions sent by this user
            { userId: user.id },
            // Transactions received by this user (proper JSON contains)
            {
              txData: {
                contains: `"to":"${user.solanaAddress}"`
              }
            }
          ]
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          txData: true,
          status: true,
          signature: true,
          createdAt: true,
          executedAt: true,
          userId: true, // Include userId to distinguish sent vs received
          user: {
            select: {
              username: true // Include the sender's username for better display
            }
          }
        },
        take: limit,
        skip: offset,
      }),
      
      // Payment requests created by user with optimized joins
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
      
      // Payment requests received by user with optimized joins
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
      
      // Count queries - optimized to run in parallel only when needed - SAME QUERY AS HOMEPAGE
      includeCounts ? Promise.all([
        prisma.transaction.count({ 
          where: {
            OR: [
              { userId: user.id },
              {
                txData: {
                  contains: `"to":"${user.solanaAddress}"`
                }
              }
            ]
          }
        }),
        prisma.paymentRequest.count({ where: { creatorId: user.id } }),
        prisma.paymentRequest.count({ where: { recipientId: user.id } })
      ]) : Promise.resolve([0, 0, 0])
    ]);

    console.log(`📊 Data fetching completed in ${Date.now() - startTime}ms`);

    // Optimize: Format payment requests without heavy processing
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

    // Combine and sort all payment requests efficiently
    const allPaymentRequests = [...formattedCreated, ...formattedReceived]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Check if cache busting is requested
    const isCacheBust = req.nextUrl.searchParams.has('t');

    console.log(`✅ Total API request time: ${Date.now() - startTime}ms (Auth: JWT)`);

    return NextResponse.json(
      {
        success: true,
        transactions: transactions || [],
        paymentRequests: allPaymentRequests,
        ...(includeCounts && {
          totals: {
            transactions: counts[0],
            createdRequests: counts[1],
            receivedRequests: counts[2]
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
    console.log(`❌ Activity error in ${Date.now() - startTime}ms`);
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