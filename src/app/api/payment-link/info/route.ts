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
    
    // Find the payment link using Prisma's query builder
    const paymentLink = await prisma.paymentLink.findFirst({
      where: {
        shortId: shortId
      },
      include: {
        creator: {
          select: {
            name: true,
            image: true,
            solanaAddress: true
          }
        }
      }
    });
    
    if (!paymentLink) {
      return NextResponse.json(
        { error: "Payment link not found" },
        { status: 404 }
      );
    }

    // Check if the link is expired but not marked as such
    if (paymentLink.status === "active" && new Date(paymentLink.expiresAt) < new Date()) {
      // Update the status using Prisma
      await prisma.paymentLink.update({
        where: { id: paymentLink.id },
        data: { status: "expired" }
      });
      
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
        name: paymentLink.creator.name,
        image: paymentLink.creator.image,
        solanaAddress: paymentLink.creator.solanaAddress
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