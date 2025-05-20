import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

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
    await prisma.user.update({
      where: { email: session.user.email },
      data: { username },
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Username updated successfully",
    });
  } catch (error) {
    console.error("Error updating username:", error);
    return NextResponse.json(
      { error: "Failed to update username" },
      { status: 500 }
    );
  }
} 