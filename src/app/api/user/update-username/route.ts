import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { signJWT } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    // Get the authenticated user from the session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
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

    if (existingUser && existingUser.email !== session.user.email) {
      return NextResponse.json(
        { error: "This username is already taken" },
        { status: 400 }
      );
    }

    // Update the user's username
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
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
      email: updatedUser.email,
      solanaAddress: updatedUser.solanaAddress,
      hasPasscode: updatedUser.hasPasscode,
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