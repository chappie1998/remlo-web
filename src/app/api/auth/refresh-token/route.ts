import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { signJWT } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    // Get the current NextAuth session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "No valid session found" },
        { status: 401 }
      );
    }

    // Get the complete user data from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        solanaAddress: true,
        hasPasscode: true,
        username: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Create a new JWT token with complete user information
    const jwtToken = signJWT({
      userId: user.id,
      email: user.email,
      solanaAddress: user.solanaAddress,
      hasPasscode: user.hasPasscode || false,
      username: user.username,
    });

    // Return success response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        solanaAddress: user.solanaAddress,
        hasPasscode: user.hasPasscode,
        username: user.username,
      },
    });

    // Set the JWT token as a secure HTTP-only cookie
    response.cookies.set('auth-token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 }
    );
  }
} 