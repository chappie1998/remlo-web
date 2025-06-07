import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import { fetchAllBalances as fetchAllSolanaBalances } from "@/lib/solana";
import { fetchAllBaseBalances } from "@/lib/base";
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
    
    if (!user?.id) {
      return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
    }

    // Fetch the full user record from the database to get all address fields
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        solanaAddress: true,
        baseAddress: true,
      }
    });

    if (!userRecord || !userRecord.solanaAddress) {
      return NextResponse.json({ error: "Wallet not found for this user." }, { status: 404 });
    }

    // Fetch all data in parallel - optimized single RPC call for token balances
    console.log('📊 Fetching balances and transactions in parallel...');
    const dataStartTime = Date.now();
    
    const [solanaTokenBalances, baseBalances, transactions] = await Promise.all([
      fetchAllSolanaBalances(userRecord.solanaAddress).catch(err => {
        console.error('Error fetching Solana token balances:', err);
        return {
          usdc: { balance: 0, formattedBalance: '0.000000' },
          usds: { balance: 0, formattedBalance: '0.000000' }
        };
      }),
      userRecord.baseAddress 
        ? fetchAllBaseBalances(userRecord.baseAddress).catch(err => {
            console.error('Error fetching Base balances:', err);
            return {
              eth: { balance: 0, formattedBalance: '0.0000' },
              usdc: { balance: 0, formattedBalance: '0.000000' }
            };
          })
        : Promise.resolve(null),
      prisma.transaction.findMany({
        where: {
          OR: [
            // Transactions sent by this user
            { userId: user.id },
            // Transactions received by this user (proper JSON contains)
            {
              txData: {
                contains: `"to":"${userRecord.solanaAddress}"`
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
        take: 20, // Increase limit since we're now getting both sent and received
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
        solanaAddress: userRecord.solanaAddress,
        baseAddress: userRecord.baseAddress,
        balances: {
          solana: {
            usdc: {
              balance: solanaTokenBalances.usdc.balance,
              formattedBalance: solanaTokenBalances.usdc.formattedBalance,
            },
            usds: {
              balance: solanaTokenBalances.usds.balance,
              formattedBalance: solanaTokenBalances.usds.formattedBalance,
            }
          },
          base: baseBalances,
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