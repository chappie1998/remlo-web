import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Get the session from NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to create a payment request" },
        { status: 401 }
      );
    }

    // Get request data
    const { amount, tokenType, note, expiresIn } = await req.json();

    // Validate amount
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Validate token type
    if (!["usds", "usdc"].includes(tokenType.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid token type. Supported types: usds, usdc" },
        { status: 400 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Log all tables for debugging
    const tableNames = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
    console.log("Database tables:", tableNames);

    // Generate a short ID for the request
    // Use prefixed random bytes in base64, removing special chars and truncating
    const shortId = `pr_${randomBytes(8)
      .toString("base64")
      .replace(/[+/=]/g, "")
      .substring(0, 8)}`;

    // Calculate expiration date if provided
    let expiresAt: Date | null = null;
    if (expiresIn) {
      // expiresIn is in hours
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(expiresIn));
    }

    console.log("Creating payment request with:", {
      shortId,
      amount,
      tokenType,
      note: note || "",
      userId: user.id
    });

    let paymentRequest;
    try {
      // Create the payment request directly without transaction first
      paymentRequest = await (prisma as any).PaymentRequest.create({
        data: {
          shortId,
          amount,
          tokenType: tokenType.toLowerCase(),
          note: note || "",
          status: "PENDING",
          expiresAt: expiresAt || null,
          creator: {
            connect: {
              id: user.id
            }
          }
        }
      });
      
      console.log("Payment request created with ID:", paymentRequest.id);

      // Verify the record was created
      const verifyRecord = await (prisma as any).PaymentRequest.findUnique({
        where: { id: paymentRequest.id }
      });
      
      console.log("Verified payment request exists:", verifyRecord ? "Yes" : "No");
    } catch (e) {
      console.error("Error creating payment request:", e);
      return NextResponse.json(
        { error: "Database error creating payment request", details: e instanceof Error ? e.message : String(e) },
        { status: 500 }
      );
    }

    // Construct the full link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    const paymentLink = `${baseUrl}/pay/${shortId}`;

    return NextResponse.json({
      success: true,
      paymentRequest: {
        id: paymentRequest.id,
        shortId: paymentRequest.shortId,
        amount: paymentRequest.amount,
        tokenType: paymentRequest.tokenType,
        note: paymentRequest.note,
        status: paymentRequest.status,
        expiresAt: paymentRequest.expiresAt,
        createdAt: paymentRequest.createdAt,
        link: paymentLink
      }
    });
  } catch (error) {
    console.error("Error creating payment request:", error);
    return NextResponse.json(
      { error: "Failed to create payment request", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 