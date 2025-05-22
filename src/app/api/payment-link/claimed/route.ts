import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma-client";

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
  try {
    // Get the session from NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to view claimed payment links" },
        { status: 401 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

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

    return NextResponse.json({
      success: true,
      claimedLinks: formattedLinks
    });

  } catch (error) {
    console.error("Error fetching claimed payment links:", error);
    return NextResponse.json(
      { error: "Failed to fetch claimed payment links", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 