import { NextRequest, NextResponse } from "next/server";
import { validateTwitterUsername, getTwitterCacheStats } from "@/lib/twitter";

export async function GET(req: NextRequest) {
  try {
    // Return cache statistics for debugging
    const stats = getTwitterCacheStats();
    
    return NextResponse.json({
      success: true,
      cache: stats
    });

  } catch (error) {
    console.error("Error getting Twitter cache stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const result = await validateTwitterUsername(username);

    return NextResponse.json({
      valid: result.valid,
      user: result.user,
      error: result.error
    });

  } catch (error) {
    console.error("Twitter username validation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 