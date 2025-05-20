import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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
    // Get the username from request body
    const { username } = await req.json();
    
    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // Use a direct query to find the user by username
    const users = await prisma.$queryRaw`
      SELECT id, username, "solanaAddress" FROM "User" 
      WHERE username = ${username}
    `;

    // Check if we found a user and it has a Solana address
    // @ts-ignore - safely ignore type errors because we're using raw queries
    if (!users || users.length === 0 || !users[0].solanaAddress) {
      // Instead of returning a 404 error, return a success response with a found flag
      return NextResponse.json({
        found: false,
        message: "User not found"
      });
    }

    // Return the user information
    return NextResponse.json({
      found: true,
      // @ts-ignore - safely ignore type errors because we're using raw queries
      username: users[0].username,
      // @ts-ignore - safely ignore type errors because we're using raw queries
      solanaAddress: users[0].solanaAddress,
    });
  } catch (error) {
    console.error("Error looking up user:", error);
    return NextResponse.json(
      { error: "An error occurred while looking up the user" },
      { status: 500 }
    );
  }
} 