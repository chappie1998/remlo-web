import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { signJWT, getUserFromRequest } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    let userEmail = null;

    // First, try to get the session from NextAuth
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      userEmail = session.user.email;
    }

    // If no NextAuth session, try to get the user from JWT token (mobile app)
    if (!userEmail) {
      const userData = await getUserFromRequest(req);
      if (userData?.email) {
        userEmail = userData.email;
      }
    }
    
    if (!userEmail) {
      return NextResponse.json(
        { error: "You must be logged in to update your username" },
        { status: 401 }
      );
    }

    // Get the new username from the request body
    const { username } = await req.json();

    // Validate the username
    if (!username || typeof username !== 'string' || username.trim() === '') {
      return NextResponse.json(
        { error: "Username cannot be empty" },
        { status: 400 }
      );
    }

    // Check if the username is already taken
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser && existingUser.email !== userEmail) {
      return NextResponse.json(
        { error: "This username is already taken" },
        { status: 400 }
      );
    }

    // Update the user's username
    const updatedUser = await prisma.user.update({
      where: { email: userEmail },
      data: { username },
      select: {
        id: true,
        email: true,
        solanaAddress: true,
        hasPasscode: true,
        username: true,
      },
    });

    // Create a new JWT token with the updated user information
    const jwtToken = signJWT({
      userId: updatedUser.id,
      email: updatedUser.email!,
      solanaAddress: updatedUser.solanaAddress,
      evmAddress: null, // Will be set when cross-chain wallet is created
      hasPasscode: updatedUser.hasPasscode || false,
      username: updatedUser.username,
    });

    // Return success response
    const response = NextResponse.json({
      success: true,
      message: "Username updated successfully",
    });

    // Set the updated JWT token as a secure HTTP-only cookie
    response.cookies.set('auth-token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error("Error updating username:", error);
    return NextResponse.json(
      { error: "Failed to update username" },
      { status: 500 }
    );
  }
} 