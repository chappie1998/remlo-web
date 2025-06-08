import { NextRequest, NextResponse } from "next/server";
import { validateTwitterUsername } from "@/lib/twitter";

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