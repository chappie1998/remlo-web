import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    // First, try to get the session from NextAuth
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email as string },
        select: {
          id: true,
          email: true,
          solanaAddress: true,
          hasPasscode: true,
          username: true,
        }
      });

      return NextResponse.json(
        { user },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // If no NextAuth session, try to get the user from the Authorization header
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('Received token in session endpoint:', token);

      // Find the session in the database
      const dbSession = await prisma.session.findUnique({
        where: { sessionToken: token },
        include: { user: true }
      });

      if (dbSession?.user && dbSession.expires > new Date()) {
        // Session is valid
        const user = await prisma.user.findUnique({
          where: { id: dbSession.user.id },
          select: {
            id: true,
            email: true,
            solanaAddress: true,
            hasPasscode: true,
            username: true,
          }
        });

        console.log('Found valid session, returning user:', user);
        return NextResponse.json(
          { user },
          {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              'Access-Control-Allow-Credentials': 'true',
            }
          }
        );
      } else {
        console.log('Invalid or expired session token');
      }
    }

    // No valid session found
    console.log('No valid session found');
    return NextResponse.json(
      { user: null },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );
  } catch (error) {
    console.error("Error checking session:", error);
    return NextResponse.json(
      { error: "Failed to check session" },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );
  } finally {
    await prisma.$disconnect();
  }
}
