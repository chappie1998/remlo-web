import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
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
  try {
    let userEmail = null;
    console.log('Handling wallet transactions request');

    // First, try to get the session from NextAuth
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      userEmail = session.user.email;
      console.log('Found user email from NextAuth session:', userEmail);
    }

    // If no NextAuth session, try to get the user from JWT token (mobile app)
    if (!userEmail) {
      const userData = await getUserFromRequest(req);
      if (userData?.email) {
        userEmail = userData.email;
        console.log('Found user email from JWT token:', userEmail);
      }
    }

    if (!userEmail) {
      console.log('No valid user session found, returning 401');
      return NextResponse.json(
        { error: "You must be signed in to view your transactions" },
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

    // Get the user's ID and Solana address
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
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

    // Get the user's transactions - SAME QUERY AS HOMEPAGE AND ACTIVITY
    const [transactions, total] = await Promise.all([
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
      })
    ]);

    // Check if cache busting is requested
    const isCacheBust = req.nextUrl.searchParams.has('t');

    return NextResponse.json(
      {
        success: true,
        transactions,
        total,
        limit,
        offset,
      },
      {
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
      }
    );
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
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
