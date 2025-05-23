import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma-client";
import { getUserFromRequest } from "@/lib/jwt";

interface ClaimedPaymentLink {
  id: string;
  shortId: string;
  creatorId: string;
  amount: string;
  tokenType: string;
  note?: string;
  status: string;
  claimedBy?: string;
  claimedAt?: Date;
  createdAt: Date;
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Use optimized JWT authentication
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to view claimed payment links" },
        { status: 401 }
      );
    }

    console.log(`⚡ Authentication completed in ${Date.now() - startTime}ms`);

    // Get all payment links created by the user that have been claimed
    const claimedLinks = await prisma.$queryRaw`
      SELECT 
        id, 
        "shortId",
        "creatorId",
        amount,
        "tokenType",
        note,
        status,
        "claimedBy",
        "claimedAt",
        "createdAt"
      FROM "PaymentLink"
      WHERE "creatorId" = ${user.id}
        AND status = 'claimed'
        AND "claimedAt" IS NOT NULL
      ORDER BY "claimedAt" DESC
    ` as ClaimedPaymentLink[];

    console.log(`📊 Data fetching completed in ${Date.now() - startTime}ms`);

    // Format the response
    const formattedLinks = claimedLinks.map((link: ClaimedPaymentLink) => ({
      id: link.id,
      shortId: link.shortId,
      amount: link.amount,
      tokenType: link.tokenType,
      note: link.note,
      status: link.status,
      claimedBy: link.claimedBy,
      claimedAt: link.claimedAt,
      createdAt: link.createdAt,
      type: 'payment_link_claimed' // To distinguish from payment requests
    }));

    console.log(`✅ Total API request time: ${Date.now() - startTime}ms (Auth: JWT)`);

    return NextResponse.json({
      success: true,
      claimedLinks: formattedLinks
    });

  } catch (error) {
    console.error("Error fetching claimed payment links:", error);
    console.log(`❌ Payment links error in ${Date.now() - startTime}ms`);
    return NextResponse.json(
      { error: "Failed to fetch claimed payment links", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 