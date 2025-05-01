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
    // Get the authenticated user from the session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be logged in to look up users" },
        { status: 401 }
      );
    }

    // Get the username from the request body
    const { username } = await req.json();

    // Validate the username
    if (!username || typeof username !== 'string' || username.trim() === '') {
      return NextResponse.json(
        { error: "Username cannot be empty" },
        { status: 400 }
      );
    }

    // Use findUnique but with email as a safety measure - this avoids type issues
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Now use a direct database query to find all users
    const users = await prisma.$queryRaw`SELECT id, username, solanaAddress FROM User WHERE username IS NOT NULL`;
    
    // Find the user with the matching username
    // @ts-ignore - safely ignore type errors because we're using raw queries
    const matchedUser = users.find(u => u.username === username);

    if (!matchedUser || !matchedUser.solanaAddress) {
      return NextResponse.json(
        { error: "User not found or has no wallet" },
        { status: 404 }
      );
    }

    // Return the user's Solana address
    return NextResponse.json({
      success: true,
      username: username,
      // @ts-ignore - safely ignore type errors because we're using raw queries
      solanaAddress: matchedUser.solanaAddress,
    });
  } catch (error) {
    console.error("Error looking up user by username:", error);
    return NextResponse.json(
      { error: "Failed to look up user" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 