import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma-client";

/**
 * Check if a user is an admin
 */
function isAdmin(email: string): boolean {
  const adminEmails = [
    'admin@remlo.com',
    'hello.notmove@gmail.com', // Add your admin email here
    // Add more admin emails as needed
  ];
  return adminEmails.includes(email);
}

/**
 * Parse transaction data to extract volume information
 */
function parseTransactionData(txData: string) {
  try {
    const data = JSON.parse(txData);
    return {
      amount: parseFloat(data.amount || '0'),
      tokenType: data.tokenType || 'unknown',
      type: data.type || 'transfer'
    };
  } catch {
    return { amount: 0, tokenType: 'unknown', type: 'unknown' };
  }
}

/**
 * Get date ranges for filtering
 */
function getDateRanges() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  return { today, weekAgo, monthAgo };
}

export async function GET(req: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    
    // In development, allow access without authentication for testing
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev && (!session?.user?.email || !isAdmin(session.user.email))) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const { today, weekAgo, monthAgo } = getDateRanges();

    // Fetch all metrics in parallel for better performance
    const [
      // User metrics
      totalUsers,
      usersWithWallets,
      usersWithPasscode,
      usersUsingMPC,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,

      // Transaction metrics
      allTransactions,
      transactionsToday,
      transactionsWeek,
      transactionsMonth,

      // Payment link metrics
      allPaymentLinks,
      paymentLinksToday,
      paymentLinksWeek,
      paymentLinksMonth,

      // Payment request metrics
      allPaymentRequests,
      paymentRequestsToday,
      paymentRequestsWeek,
      paymentRequestsMonth,

      // Recent activity
      recentTransactions,
      recentUsers,
      recentPaymentLinks,
      recentPaymentRequests,
    ] = await Promise.all([
      // User counts
      prisma.user.count(),
      prisma.user.count({ where: { solanaAddress: { not: null } } }),
      prisma.user.count({ where: { hasPasscode: true } }),
      prisma.user.count({ where: { usesMPC: true } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),

      // Transaction data
      prisma.transaction.findMany({
        select: {
          id: true,
          status: true,
          txData: true,
          createdAt: true,
          executedAt: true,
        }
      }),
      prisma.transaction.count({ where: { createdAt: { gte: today } } }),
      prisma.transaction.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.transaction.count({ where: { createdAt: { gte: monthAgo } } }),

      // Payment links using raw queries to avoid Prisma model issues
      prisma.$queryRaw<Array<{
        id: string;
        status: string;
        amount: string;
        tokenType: string;
        createdAt: Date;
        claimedAt: Date | null;
      }>>`
        SELECT id, status, amount, "tokenType", "createdAt", "claimedAt"
        FROM "PaymentLink"
      `,
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM "PaymentLink"
        WHERE "createdAt" >= ${today}
      `,
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM "PaymentLink"
        WHERE "createdAt" >= ${weekAgo}
      `,
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM "PaymentLink"
        WHERE "createdAt" >= ${monthAgo}
      `,

      // Payment requests
      prisma.paymentRequest.findMany({
        select: {
          id: true,
          status: true,
          amount: true,
          tokenType: true,
          createdAt: true,
        }
      }),
      prisma.paymentRequest.count({ where: { createdAt: { gte: today } } }),
      prisma.paymentRequest.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.paymentRequest.count({ where: { createdAt: { gte: monthAgo } } }),

      // Recent activity for the activity feed
      prisma.transaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          txData: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              username: true,
              email: true,
            }
          }
        }
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
        }
      }),
      prisma.$queryRaw<Array<{
        id: string;
        shortId: string;
        amount: string;
        tokenType: string;
        status: string;
        createdAt: Date;
      }>>`
        SELECT id, "shortId", amount, "tokenType", status, "createdAt"
        FROM "PaymentLink"
        ORDER BY "createdAt" DESC
        LIMIT 5
      `,
      prisma.paymentRequest.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          shortId: true,
          amount: true,
          tokenType: true,
          status: true,
          createdAt: true,
        }
      }),
    ]);

    // Process transaction data for volume calculations
    const transactionVolume = allTransactions.reduce((acc, tx) => {
      const { amount, tokenType } = parseTransactionData(tx.txData);
      const isToday = tx.createdAt >= today;
      const isThisWeek = tx.createdAt >= weekAgo;
      const isThisMonth = tx.createdAt >= monthAgo;

      if (tokenType === 'usdc') {
        acc.totalUSDC += amount;
        if (isToday) acc.todayUSDC += amount;
        if (isThisWeek) acc.weekUSDC += amount;
        if (isThisMonth) acc.monthUSDC += amount;
      } else if (tokenType === 'usds') {
        acc.totalUSDS += amount;
        if (isToday) acc.todayUSDS += amount;
        if (isThisWeek) acc.weekUSDS += amount;
        if (isThisMonth) acc.monthUSDS += amount;
      }

      return acc;
    }, {
      totalUSDC: 0,
      totalUSDS: 0,
      todayUSDC: 0,
      todayUSDS: 0,
      weekUSDC: 0,
      weekUSDS: 0,
      monthUSDC: 0,
      monthUSDS: 0,
    });

    // Calculate volume from payment links and requests
    const paymentLinkVolume = allPaymentLinks.reduce((acc, link) => {
      const amount = parseFloat(link.amount || '0');
      const tokenType = link.tokenType?.toLowerCase();
      const isToday = link.createdAt >= today;
      const isThisWeek = link.createdAt >= weekAgo;
      const isThisMonth = link.createdAt >= monthAgo;

      if (tokenType === 'usdc') {
        acc.totalUSDC += amount;
        if (isToday) acc.todayUSDC += amount;
        if (isThisWeek) acc.weekUSDC += amount;
        if (isThisMonth) acc.monthUSDC += amount;
      } else if (tokenType === 'usds') {
        acc.totalUSDS += amount;
        if (isToday) acc.todayUSDS += amount;
        if (isThisWeek) acc.weekUSDS += amount;
        if (isThisMonth) acc.monthUSDS += amount;
      }

      return acc;
    }, {
      totalUSDC: 0,
      totalUSDS: 0,
      todayUSDC: 0,
      todayUSDS: 0,
      weekUSDC: 0,
      weekUSDS: 0,
      monthUSDC: 0,
      monthUSDS: 0,
    });

    const paymentRequestVolume = allPaymentRequests.reduce((acc, req) => {
      const amount = parseFloat(req.amount || '0');
      const tokenType = req.tokenType?.toLowerCase();
      const isToday = req.createdAt >= today;
      const isThisWeek = req.createdAt >= weekAgo;
      const isThisMonth = req.createdAt >= monthAgo;

      if (tokenType === 'usdc') {
        acc.totalUSDC += amount;
        if (isToday) acc.todayUSDC += amount;
        if (isThisWeek) acc.weekUSDC += amount;
        if (isThisMonth) acc.monthUSDC += amount;
      } else if (tokenType === 'usds') {
        acc.totalUSDS += amount;
        if (isToday) acc.todayUSDS += amount;
        if (isThisWeek) acc.weekUSDS += amount;
        if (isThisMonth) acc.monthUSDS += amount;
      }

      return acc;
    }, {
      totalUSDC: 0,
      totalUSDS: 0,
      todayUSDC: 0,
      todayUSDS: 0,
      weekUSDC: 0,
      weekUSDS: 0,
      monthUSDC: 0,
      monthUSDS: 0,
    });

    // Combine all volume sources
    const combinedVolume = {
      totalUSDC: transactionVolume.totalUSDC + paymentLinkVolume.totalUSDC + paymentRequestVolume.totalUSDC,
      totalUSDS: transactionVolume.totalUSDS + paymentLinkVolume.totalUSDS + paymentRequestVolume.totalUSDS,
      todayUSDC: transactionVolume.todayUSDC + paymentLinkVolume.todayUSDC + paymentRequestVolume.todayUSDC,
      todayUSDS: transactionVolume.todayUSDS + paymentLinkVolume.todayUSDS + paymentRequestVolume.todayUSDS,
      weekUSDC: transactionVolume.weekUSDC + paymentLinkVolume.weekUSDC + paymentRequestVolume.weekUSDC,
      weekUSDS: transactionVolume.weekUSDS + paymentLinkVolume.weekUSDS + paymentRequestVolume.weekUSDS,
      monthUSDC: transactionVolume.monthUSDC + paymentLinkVolume.monthUSDC + paymentRequestVolume.monthUSDC,
      monthUSDS: transactionVolume.monthUSDS + paymentLinkVolume.monthUSDS + paymentRequestVolume.monthUSDS,
    };

    // Calculate swap volume from transactions
    const swapVolume = allTransactions
      .filter(tx => {
        try {
          const txData = JSON.parse(tx.txData);
          // Check if transaction has swap data
          return !!txData.swap;
        } catch {
          return false;
        }
      })
      .reduce((acc, tx) => {
        const { amount } = parseTransactionData(tx.txData);
        return acc + amount;
      }, 0);

    // Calculate USDS circulation (total USDS minted/converted/swapped from USDC)
    const usdsCirculationTxs = allTransactions.filter(tx => {
      try {
        const txData = JSON.parse(tx.txData);
        const { type, tokenType } = parseTransactionData(tx.txData);
        
        // Include direct USDS minting/converting
        if ((type === 'convert' || type === 'mint') && tokenType === 'usds') {
          return true;
        }
        
        // Include USDC to USDS swaps (this is how USDS enters circulation)
        if (txData.swap === 'USDC_TO_USDS' || 
            (typeof txData.swap === 'object' && 
             txData.swap.fromToken?.toLowerCase() === 'usdc' && 
             txData.swap.toToken?.toLowerCase() === 'usds')) {
          return true;
        }
        
        return false;
      } catch {
        return false;
      }
    });

    const usdsCirculation = usdsCirculationTxs.reduce((acc, tx) => {
      const { amount } = parseTransactionData(tx.txData);
      return acc + amount;
    }, 0);



    // Process payment link status counts
    const paymentLinkStats = allPaymentLinks.reduce((acc, link) => {
      acc.total++;
      switch (link.status) {
        case 'active':
          acc.active++;
          break;
        case 'claimed':
          acc.claimed++;
          break;
        case 'expired':
          acc.expired++;
          break;
      }
      return acc;
    }, { total: 0, active: 0, claimed: 0, expired: 0 });

    // Process payment request status counts
    const paymentRequestStats = allPaymentRequests.reduce((acc, req) => {
      acc.total++;
      switch (req.status.toLowerCase()) {
        case 'pending':
          acc.pending++;
          break;
        case 'completed':
          acc.completed++;
          break;
        case 'cancelled':
          acc.cancelled++;
          break;
      }
      return acc;
    }, { total: 0, pending: 0, completed: 0, cancelled: 0 });

    // Process transaction status counts
    const transactionStats = allTransactions.reduce((acc, tx) => {
      acc.total++;
      switch (tx.status) {
        case 'pending':
          acc.pending++;
          break;
        case 'executed':
          acc.executed++;
          break;
        case 'failed':
          acc.failed++;
          break;
      }
      return acc;
    }, { total: 0, pending: 0, executed: 0, failed: 0 });

    // Build recent activity feed
    const recentActivity = [
      ...recentUsers.map(user => ({
        id: `user-${user.id}`,
        type: 'user_signup' as const,
        description: `New user signed up: ${user.username || user.email}`,
        timestamp: user.createdAt.toISOString(),
      })),
      ...recentTransactions.map(tx => {
        const { amount, tokenType } = parseTransactionData(tx.txData);
        return {
          id: `tx-${tx.id}`,
          type: 'transaction' as const,
          description: `Transaction by ${tx.user.username || tx.user.email}`,
          timestamp: tx.createdAt.toISOString(),
          amount: amount.toString(),
          tokenType,
        };
      }),
      ...recentPaymentLinks.map(link => ({
        id: `pl-${link.id}`,
        type: 'payment_link' as const,
        description: `Payment link created: ${link.shortId}`,
        timestamp: link.createdAt.toISOString(),
        amount: link.amount,
        tokenType: link.tokenType,
      })),
      ...recentPaymentRequests.map(req => ({
        id: `pr-${req.id}`,
        type: 'payment_request' as const,
        description: `Payment request created: ${req.shortId}`,
        timestamp: req.createdAt.toISOString(),
        amount: req.amount,
        tokenType: req.tokenType,
      })),
    ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

    // Build the response
    const metrics = {
      users: {
        total: totalUsers,
        withWallets: usersWithWallets,
        withPasscode: usersWithPasscode,
        usingMPC: usersUsingMPC,
        newToday: newUsersToday,
        newThisWeek: newUsersWeek,
        newThisMonth: newUsersMonth,
      },
      transactions: {
        total: transactionStats.total,
        pending: transactionStats.pending,
        executed: transactionStats.executed,
        failed: transactionStats.failed,
        todayCount: transactionsToday,
        weekCount: transactionsWeek,
        monthCount: transactionsMonth,
      },
      paymentLinks: {
        total: paymentLinkStats.total,
        active: paymentLinkStats.active,
        claimed: paymentLinkStats.claimed,
        expired: paymentLinkStats.expired,
        todayCount: Number(paymentLinksToday[0]?.count || 0),
        weekCount: Number(paymentLinksWeek[0]?.count || 0),
        monthCount: Number(paymentLinksMonth[0]?.count || 0),
      },
      paymentRequests: {
        total: paymentRequestStats.total,
        pending: paymentRequestStats.pending,
        completed: paymentRequestStats.completed,
        cancelled: paymentRequestStats.cancelled,
        todayCount: paymentRequestsToday,
        weekCount: paymentRequestsWeek,
        monthCount: paymentRequestsMonth,
      },
      volume: {
        ...combinedVolume,
        swapVolume,
        usdsCirculation,
        // Breakdown by source
        transactions: transactionVolume,
        paymentLinks: paymentLinkVolume,
        paymentRequests: paymentRequestVolume,
      },
      recentActivity,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching admin metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 