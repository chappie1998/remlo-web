import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { fetchAccountBalance, fetchSplTokenBalance, fetchUsdsTokenBalance } from "@/lib/solana";
import connectionPool from "@/lib/solana-connection-pool";

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
    console.log('Handling wallet overview request');
    console.log(`Connection pool stats: ${connectionPool.getConnectionCount()} active connections`);

    // Get the session from NextAuth (single lookup)
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      userEmail = session.user.email;
      console.log('Found user email from NextAuth session:', userEmail);
    }

    if (!userEmail) {
      console.log('No valid user session found, returning 401');
      return NextResponse.json(
        { error: "You must be signed in to view your wallet overview" },
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
      where: { email: userEmail },
      select: {
        id: true,
        solanaAddress: true,
      },
    });

    if (!user || !user.solanaAddress) {
      return NextResponse.json(
        { error: "Wallet not set up" },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Fetch all data in parallel
    const [
      solBalance,
      usdcBalance,
      usdsBalance,
      transactions
    ] = await Promise.all([
      fetchAccountBalance(user.solanaAddress).catch(err => {
        console.error('Error fetching SOL balance:', err);
        return { balanceInLamports: 0, balanceInSol: '0.000000000' };
      }),
      fetchSplTokenBalance(user.solanaAddress).catch(err => {
        console.error('Error fetching USDC balance:', err);
        return { balance: 0, formattedBalance: '0.000000' };
      }),
      fetchUsdsTokenBalance(user.solanaAddress).catch(err => {
        console.error('Error fetching USDS balance:', err);
        return { balance: 0, formattedBalance: '0.000000' };
      }),
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
        take: 10, // Only get recent transactions
      }).catch(err => {
        console.error('Error fetching transactions:', err);
        return [];
      })
    ]);

    // Check if cache busting is requested (after transactions)
    const isCacheBust = req.nextUrl.searchParams.has('t');
    
    return NextResponse.json(
      {
        success: true,
        address: user.solanaAddress,
        balances: {
          sol: {
            balance: solBalance.balanceInLamports,
            formattedBalance: solBalance.balanceInSol,
          },
          usdc: {
            balance: usdcBalance.balance,
            formattedBalance: usdcBalance.formattedBalance,
          },
          usds: {
            balance: usdsBalance.balance,
            formattedBalance: usdsBalance.formattedBalance,
          }
        },
        transactions: transactions,
        total: transactions.length,
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
            : 'public, max-age=15, s-maxage=15', // Reduced cache time to 15 seconds
          ...(isCacheBust && {
            'Pragma': 'no-cache',
            'Expires': '0'
          }),
        }
      }
    );
  } catch (error) {
    console.error("Error fetching wallet overview:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet overview" },
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