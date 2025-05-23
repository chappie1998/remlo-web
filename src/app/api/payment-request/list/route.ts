import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { generatePaymentLink } from "@/lib/paymentLinkUtils";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwt";

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
  const startTime = Date.now();
  
  try {
    // Use optimized JWT authentication
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to list payment requests" },
        { status: 401 }
      );
    }

    console.log(`⚡ Authentication completed in ${Date.now() - startTime}ms`);

    // Pagination params
    const url = req.nextUrl;
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Quick check for any payment requests first (optimization for empty results)
    const [hasCreated, hasReceived] = await Promise.all([
      prisma.paymentRequest.count({ where: { creatorId: user.id }, take: 1 }),
      prisma.paymentRequest.count({ where: { recipientId: user.id }, take: 1 })
    ]);

    // If no payment requests exist at all, return early
    if (hasCreated === 0 && hasReceived === 0) {
      console.log(`User has no payment requests, returning empty result`);
      console.log(`✅ Total API request time: ${Date.now() - startTime}ms (Auth: JWT) - Empty result`);
      const isCacheBust = req.nextUrl.searchParams.has('t');
      
      return NextResponse.json({
        success: true,
        paymentRequests: [],
        createdTotal: 0,
        receivedTotal: 0,
        limit,
        offset,
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
          'Cache-Control': isCacheBust 
            ? 'no-cache, no-store, must-revalidate' 
            : 'public, max-age=60, s-maxage=60', // Cache longer for empty results
          ...(isCacheBust && {
            'Pragma': 'no-cache',
            'Expires': '0'
          }),
        }
      });
    }

    // List all payment requests created by this user
    const [createdRequests, createdTotal] = await Promise.all([
      hasCreated > 0 ? prisma.paymentRequest.findMany({
        where: { creatorId: user.id },
        include: {
          recipient: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }) : Promise.resolve([]),
      hasCreated > 0 ? prisma.paymentRequest.count({ where: { creatorId: user.id } }) : Promise.resolve(0)
    ]);

    // List all payment requests where this user is the recipient
    const [receivedRequests, receivedTotal] = await Promise.all([
      hasReceived > 0 ? prisma.paymentRequest.findMany({
        where: { recipientId: user.id },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }) : Promise.resolve([]),
      hasReceived > 0 ? prisma.paymentRequest.count({ where: { recipientId: user.id } }) : Promise.resolve(0)
    ]);

    console.log(`📊 Data fetching completed in ${Date.now() - startTime}ms`);
    console.log(`Found ${createdRequests.length} created payment requests and ${receivedRequests.length} received payment requests for user`);

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

    // Check if cache busting is requested
    const isCacheBust = req.nextUrl.searchParams.has('t');

    console.log(`✅ Total API request time: ${Date.now() - startTime}ms (Auth: JWT)`);

    return NextResponse.json({
      success: true,
      paymentRequests: allPaymentRequests,
      createdTotal,
      receivedTotal,
      limit,
      offset,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        // Add caching headers
        'Cache-Control': isCacheBust 
          ? 'no-cache, no-store, must-revalidate' 
          : 'public, max-age=30, s-maxage=30', // Cache for 30 seconds
        ...(isCacheBust && {
          'Pragma': 'no-cache',
          'Expires': '0'
        }),
      }
    });
  } catch (error) {
    console.error("Error listing payment requests:", error);
    console.log(`❌ Payment requests error in ${Date.now() - startTime}ms`);
    return NextResponse.json(
      { error: "Failed to list payment requests", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 