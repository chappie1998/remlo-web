import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma-client";

interface PaymentLinkType {
  id: string;
  shortId: string;
  creatorId: string;
  amount: string;
  tokenType: string;
  note?: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  claimedAt?: Date;
  claimedBy?: string;
}

export async function GET(req: NextRequest) {
  try {
    // Get the session from NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to view payment links" },
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

    // Get all payment links created by the user using raw query to avoid Prisma model issues
    const paymentLinks = await prisma.$queryRaw`
      SELECT 
        id, 
        shortId,
        creatorId,
        amount,
        tokenType,
        note,
        status,
        expiresAt,
        createdAt,
        claimedAt,
        claimedBy
      FROM "PaymentLink"
      WHERE "creatorId" = ${user.id}
      ORDER BY "createdAt" DESC
    ` as PaymentLinkType[];

    // Update status for any expired links that still show as active
    const now = new Date();
    const updatedLinks = paymentLinks.map((link: PaymentLinkType) => {
      // Check if the link is expired but still marked as active
      if (link.status === 'active' && new Date(link.expiresAt) < now) {
        return {
          ...link,
          status: 'expired'
        };
      }
      return link;
    });

    // Update expired links in the database (but don't wait for it)
    const expiredLinks = updatedLinks.filter(
      (link: PaymentLinkType) => link.status === 'expired' && paymentLinks.find((pl: PaymentLinkType) => pl.id === link.id)?.status === 'active'
    );
    
    if (expiredLinks.length > 0) {
      // Update in database without awaiting
      Promise.all(
        expiredLinks.map((link: PaymentLinkType) => 
          prisma.$executeRaw`
            UPDATE "PaymentLink"
            SET status = 'expired'
            WHERE id = ${link.id}
          `
        )
      ).catch(error => {
        console.error('Error updating expired links:', error);
      });
    }

    return NextResponse.json(updatedLinks);
  } catch (error) {
    console.error("Error fetching payment links:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment links" },
      { status: 500 }
    );
  }
} 