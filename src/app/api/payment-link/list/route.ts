import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/jwt";
import prisma from "@/lib/prisma-client";

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
  verificationData?: string;
  displayOtp?: string;
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Use optimized JWT authentication (same pattern as other endpoints)
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to view payment links" },
        { status: 401 }
      );
    }

    console.log(`⚡ Authentication completed in ${Date.now() - startTime}ms`);

    // Get all payment links created by the user using raw query to avoid Prisma model issues
    const paymentLinks = await prisma.$queryRaw`
      SELECT 
        id, 
        "shortId",
        "creatorId",
        amount,
        "tokenType",
        note,
        status,
        "expiresAt",
        "createdAt",
        "claimedAt",
        "claimedBy",
        "verificationData"
      FROM "PaymentLink"
      WHERE "creatorId" = ${user.id}
      ORDER BY "createdAt" DESC
    ` as PaymentLinkType[];

    // Update status for any expired links that still show as active
    const now = new Date();
    const updatedLinks = paymentLinks.map((link: PaymentLinkType) => {
      let displayOtp: string | undefined = undefined;
      if (link.status === 'active' && link.verificationData) {
        const parts = link.verificationData.split(':');
        if (parts.length > 1) {
          displayOtp = parts[parts.length - 1];
        }
      }

      // Check if the link is expired but still marked as active
      if (link.status === 'active' && new Date(link.expiresAt) < now) {
        return {
          ...link,
          status: 'expired',
          displayOtp: undefined
        };
      }
      return {
        ...link,
        displayOtp
      };
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

    console.log(`📊 Data fetching completed in ${Date.now() - startTime}ms`);
    console.log(`✅ Total API request time: ${Date.now() - startTime}ms (Auth: JWT)`);

    return NextResponse.json(updatedLinks);
  } catch (error) {
    console.error("Error fetching payment links:", error);
    console.log(`❌ Payment links error in ${Date.now() - startTime}ms`);
    return NextResponse.json(
      { error: "Failed to fetch payment links" },
      { status: 500 }
    );
  }
} 