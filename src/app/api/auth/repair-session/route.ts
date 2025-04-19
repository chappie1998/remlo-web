import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

// This endpoint is for fixing broken sessions
export async function POST(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    // If no session, return error
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "No active session found" },
        { status: 401 }
      );
    }

    // Get the email from session
    const email = session.user.email;

    // Get the user from the database
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        solanaAddress: true,
        hasPasscode: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Return user data that can be used to repair the session
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        solanaAddress: user.solanaAddress,
        hasPasscode: user.hasPasscode,
      },
    });
  } catch (error) {
    console.error("Error repairing session:", error);
    return NextResponse.json(
      { error: "Failed to repair session" },
      { status: 500 }
    );
  }
}
