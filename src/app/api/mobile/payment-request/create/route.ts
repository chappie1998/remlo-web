import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/jwt";

// Handle OPTIONS request for CORS preflight
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
    console.log('Handling mobile payment request create');
    
    // Use JWT authentication
    const userData = await getUserFromRequest(req);
    
    if (!userData?.email) {
      return NextResponse.json(
        { error: "You must be signed in to create payment requests" },
        { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: userData.email }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }
    
    console.log('Authenticated user:', user.email);
    
    // Get request data
    const { amount, tokenType, note, recipientUsername } = await req.json();
    
    // Validate amount
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }
    
    // Validate token type
    if (!["usds", "usdc"].includes(tokenType.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid token type. Supported types: usds, usdc" },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }
    
    // Recipient is required
    if (!recipientUsername) {
      return NextResponse.json(
        { error: "Recipient username is required" },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }
    
    // Find recipient user
    const recipient = await prisma.user.findUnique({
      where: { username: recipientUsername }
    });
    
    if (!recipient) {
      return NextResponse.json(
        { error: `User '${recipientUsername}' not found` },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }
    
    // Generate a short ID for the request
    const shortId = `pr_${randomBytes(8)
      .toString("base64")
      .replace(/[+/=]/g, "")
      .substring(0, 8)}`;
    
    console.log("Creating payment request with:", {
      shortId,
      amount,
      tokenType,
      note: note || "",
      userId: user.id,
      recipientId: recipient.id,
    });
    
    // Create the payment request
    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        shortId,
        amount: amount.toString(),
        tokenType: tokenType.toLowerCase(),
        note: note || "",
        status: "PENDING",
        creator: {
          connect: {
            id: user.id
          }
        },
        recipient: {
          connect: {
            id: recipient.id
          }
        }
      }
    });
    
    console.log("Payment request created with ID:", paymentRequest.id);
    
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
        createdAt: paymentRequest.createdAt,
        link: paymentLink,
        recipientUsername: recipient.username
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      }
    });
  } catch (error) {
    console.error("Error creating payment request:", error);
    return NextResponse.json(
      { error: "Failed to create payment request", details: error instanceof Error ? error.message : String(error) },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );
  } finally {
    await prisma.$disconnect();
  }
} 