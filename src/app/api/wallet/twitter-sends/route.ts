import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/jwt";
import prisma from "@/lib/prisma";

interface TwitterSend {
  id: string;
  type: 'direct_transfer' | 'payment_link';
  twitterUsername: string;
  amount: string;
  tokenType: string;
  note?: string;
  status: string;
  createdAt: Date;
  signature?: string; // for direct transfers
  paymentUrl?: string; // for payment links
  claimedAt?: Date; // for payment links
  claimedBy?: string; // for payment links
  dmSent?: boolean;
}

export async function GET(req: NextRequest) {
  try {
    let userEmail = null;
    let userId = null;
    console.log('📋 Fetching Twitter send history');

    // Authentication logic
    const session = await getServerSession(authOptions);
    if (session?.user) {
      userEmail = session.user.email;
      userId = session.user.id;
    }

    // Fallback to JWT if no NextAuth session
    if (!userEmail && !userId) {
      const userData = await getUserFromRequest(req);
      if (userData?.email || userData?.id) {
        userEmail = userData.email;
        userId = userData.id;
      }
    }

    if (!userEmail && !userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user
    const whereClause = userEmail ? { email: userEmail } : { id: userId! };
    const user = await prisma.user.findUnique({
      where: whereClause,
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get URL parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const twitterSends: TwitterSend[] = [];

    // 1. Get direct transfers (transactions with type send_to_twitter)
    console.log(`🔍 Looking for Twitter transactions for user ${user.id}`);
    const directTransfers = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        txData: {
          contains: '"type":"send_to_twitter"'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    console.log(`📊 Found ${directTransfers.length} direct transfer records`);

    // Parse and add direct transfers
    directTransfers.forEach(tx => {
      try {
        const txData = JSON.parse(tx.txData);
        if (txData.type === 'send_to_twitter') {
          twitterSends.push({
            id: tx.id,
            type: 'direct_transfer',
            twitterUsername: txData.twitterUsername,
            amount: txData.amount.toString(),
            tokenType: txData.tokenType,
            note: txData.note,
            status: tx.status,
            createdAt: tx.createdAt,
            signature: tx.signature || undefined,
            dmSent: true // Assume DM was attempted if transaction was created
          });
        }
      } catch (error) {
        console.error('Error parsing transaction data:', error);
      }
    });

    // 2. Get payment links created for Twitter users
    console.log(`🔗 Looking for Twitter payment links for user ${user.id}`);
    const paymentLinks = await prisma.paymentLink.findMany({
      where: {
        creatorId: user.id,
        note: {
          contains: 'via Twitter'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    console.log(`📊 Found ${paymentLinks.length} payment link records`);

    // Parse and add payment links
    paymentLinks.forEach(pl => {
      // Extract Twitter username from note if possible
      const noteMatch = pl.note?.match(/Payment from .+ to @?(\w+) via Twitter/) || 
                       pl.note?.match(/via Twitter to @?(\w+)/) ||
                       pl.note?.match(/Twitter user @?(\w+)/);
      
      const twitterUsername = noteMatch?.[1] || 'Unknown';

      twitterSends.push({
        id: pl.id,
        type: 'payment_link',
        twitterUsername,
        amount: pl.amount,
        tokenType: pl.tokenType,
        note: pl.note || undefined,
        status: pl.status,
        createdAt: pl.createdAt,
        paymentUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/payment-link/${pl.shortId}`,
        claimedAt: pl.claimedAt || undefined,
        claimedBy: pl.claimedBy || undefined,
        dmSent: true // Assume DM was sent when payment link was created
      });
    });

    // Sort all sends by creation date
    twitterSends.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination to combined results
    const paginatedSends = twitterSends.slice(offset, offset + limit);

    console.log(`📋 Returning ${paginatedSends.length} Twitter sends (total: ${twitterSends.length})`);

    return NextResponse.json({
      success: true,
      sends: paginatedSends,
      total: twitterSends.length,
      offset,
      limit
    });

  } catch (error) {
    console.error("Error fetching Twitter sends:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 