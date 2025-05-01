import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Return the user information
    return NextResponse.json({
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
  } finally {
    await prisma.$disconnect();
  }
} 