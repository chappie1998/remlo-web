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

// Simple version that returns a fixed response for debugging
export async function GET(
  request: NextRequest
) {
  try {
    // Extract shortId from the request URL
    const pathParts = request.nextUrl.pathname.split('/');
    const shortId = pathParts[pathParts.length - 1];
    console.log('Extracted shortId from URL:', shortId);
    
    // Return a test payload for now
    return NextResponse.json({
      id: "test-id-123",
      shortId: shortId || "test-shortid",
      amount: "0.1",
      tokenType: "usdc",
      note: "Test payment link",
      status: "active",
      expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
      createdAt: new Date().toISOString(),
      creator: {
        name: "Test User",
        image: null
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