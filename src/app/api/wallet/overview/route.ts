import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { fetchAllBalances } from "@/lib/solana";
import connectionPool from "@/lib/solana-connection-pool";
import prisma from "@/lib/prisma";

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
  const requestStartTime = Date.now();
  
  try {
    console.log('🚀 Handling wallet overview request');
    console.log(`Connection pool stats: ${connectionPool.getConnectionCount()} active connections`);
    
    // Ultra-fast JWT authentication with NextAuth fallback
    console.log('⚡ Getting user from JWT/NextAuth...');
    const authStartTime = Date.now();
    
    const user = await getUserFromRequest(req);
    console.log(`⚡ Authentication completed in ${Date.now() - authStartTime}ms`);
    
    if (!user?.solanaAddress) {
      console.log('No valid token or wallet not set up');
      return NextResponse.json(
        { error: "You must be signed in and have a wallet set up" },
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

    console.log(`Found user: ${user.email} (via JWT/NextAuth)`);

    // Fetch all data in parallel - optimized single RPC call for token balances
    console.log('📊 Fetching balances and transactions in parallel...');
    const dataStartTime = Date.now();
    
    const [tokenBalances, transactions] = await Promise.all([
      fetchAllBalances(user.solanaAddress).catch(err => {
        console.error('Error fetching token balances:', err);
        return {
          usdc: { balance: 0, formattedBalance: '0.000000' },
          usds: { balance: 0, formattedBalance: '0.000000' }
        };
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
    
    console.log(`📊 Data fetching completed in ${Date.now() - dataStartTime}ms`);

    // Check if cache busting is requested
    const isCacheBust = req.nextUrl.searchParams.has('t');
    
    console.log(`✅ Total API request time: ${Date.now() - requestStartTime}ms (Auth: JWT)`);
    
    return NextResponse.json(
      {
        success: true,
        address: user.solanaAddress,
        balances: {
          usdc: {
            balance: tokenBalances.usdc.balance,
            formattedBalance: tokenBalances.usdc.formattedBalance,
          },
          usds: {
            balance: tokenBalances.usds.balance,
            formattedBalance: tokenBalances.usds.formattedBalance,
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
          // Optimized caching
          'Cache-Control': isCacheBust 
            ? 'no-cache, no-store, must-revalidate' 
            : 'private, max-age=30',
          ...(isCacheBust && {
            'Pragma': 'no-cache',
            'Expires': '0'
          }),
        }
      }
    );
  } catch (error) {
    console.error("❌ Error fetching wallet overview:", error);
    console.log(`❌ Failed API request time: ${Date.now() - requestStartTime}ms`);
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