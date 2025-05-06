import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma-client";

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

// Use a normal route with query parameters instead of dynamic route params
export async function GET(request: NextRequest) {
  try {
    // Get shortId from the search params
    const searchParams = request.nextUrl.searchParams;
    const shortId = searchParams.get('id');
    
    console.log('Getting payment link with shortId:', shortId);
    
    if (!shortId) {
      return NextResponse.json(
        { error: "Payment link ID is required" },
        { status: 400 }
      );
    }
    
    // Find the payment link using raw SQL since there's a Prisma issue
    const rawPaymentLinks = await prisma.$queryRaw`
      SELECT 
        pl.id, 
        pl.shortId,
        pl."creatorId",
        pl.amount,
        pl."tokenType",
        pl.note,
        pl.status,
        pl."expiresAt",
        pl."verificationData",
        pl."createdAt",
        u.name as creatorName,
        u.image as creatorImage,
        u."solanaAddress" as creatorSolanaAddress
      FROM "PaymentLink" pl
      JOIN "User" u ON pl."creatorId" = u.id
      WHERE pl."shortId" = ${shortId}
      LIMIT 1
    `;
    
    // Convert the raw result to a single payment link
    const paymentLinks = rawPaymentLinks as any[];
    
    if (!paymentLinks || paymentLinks.length === 0) {
      return NextResponse.json(
        { error: "Payment link not found" },
        { status: 404 }
      );
    }
    
    const paymentLink = paymentLinks[0];

    // Check if the link is expired but not marked as such
    if (paymentLink.status === "active" && new Date(paymentLink.expiresAt) < new Date()) {
      // Update the status using raw SQL
      await prisma.$executeRaw`
        UPDATE "PaymentLink"
        SET "status" = 'expired'
        WHERE "id" = ${paymentLink.id}
      `;
      
      paymentLink.status = "expired";
    }

    // Return the payment link details
    return NextResponse.json({
      id: paymentLink.id,
      shortId: paymentLink.shortId,
      amount: paymentLink.amount,
      tokenType: paymentLink.tokenType,
      note: paymentLink.note,
      status: paymentLink.status,
      expiresAt: paymentLink.expiresAt,
      createdAt: paymentLink.createdAt,
      creator: {
        name: paymentLink.creatorName,
        image: paymentLink.creatorImage,
        solanaAddress: paymentLink.creatorSolanaAddress
      }
    });
  } catch (error) {
    console.error("Error retrieving payment link:", error);
    return NextResponse.json(
      { error: "Failed to retrieve payment link" },
      { status: 500 }
    );
  }
} 