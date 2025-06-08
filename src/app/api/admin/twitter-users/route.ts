import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Get all users with Twitter usernames (non-null username field)
    const twitterUsers = await prisma.user.findMany({
      where: {
        username: {
          not: null
        }
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        image: true,
        solanaAddress: true,
        hasPasscode: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      count: twitterUsers.length,
      users: twitterUsers
    });

  } catch (error) {
    console.error("Error fetching Twitter users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 