import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Shared CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(req: NextRequest) {
  try {
    // Try to get the NextAuth session
    const session = await getServerSession(authOptions);

    if (session?.user?.email) {
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

      if (user) {
        return NextResponse.json({ user }, { headers: corsHeaders });
      }
    }

    // Fallback: try to find session from Authorization header (Bearer token)
    const authHeader = req.headers.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);

      const dbSession = await prisma.session.findUnique({
        where: { sessionToken: token },
        include: { user: true },
      });

      const sessionValid = dbSession && dbSession.expires > new Date();
      const userId = dbSession?.user?.id;

      if (sessionValid && userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            solanaAddress: true,
            hasPasscode: true,
            username: true,
          },
        });

        if (user) {
          return NextResponse.json({ user }, { headers: corsHeaders });
        }
      }
    }

    // No valid session found
    return NextResponse.json({ user: null }, { headers: corsHeaders });
  } catch (error) {
    console.error("❌ Error checking session:", error);
    return NextResponse.json({ error: "Failed to check session" }, { status: 500, headers: corsHeaders });
  }
}
