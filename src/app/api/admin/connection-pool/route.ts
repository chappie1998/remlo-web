import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectionPool from "@/lib/solana-connection-pool";

/**
 * API endpoint to check the status of the Solana connection pool
 * This is useful for monitoring the connection pooling efficiency
 */
export async function GET(req: NextRequest) {
  try {
    // Authentication check - only admins should access this endpoint in production
    const session = await getServerSession(authOptions);
    
    // In development, allow access without authentication
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev && (!session?.user?.email || !isAdmin(session.user.email))) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    // Get connection pool info
    const metrics = {
      connectionCount: connectionPool.getConnectionCount(),
      defaultEndpoint: connectionPool.getDefaultEndpoint(),
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error checking connection pool status:", error);
    return NextResponse.json(
      { error: "Failed to check connection pool status" },
      { status: 500 }
    );
  }
}

/**
 * Check if a user is an admin
 * This is a simple function that you would replace with your real admin check
 */
function isAdmin(email: string): boolean {
  // In a real app, you'd check against a database or config
  const adminEmails = ['admin@example.com']; // Replace with your admin emails
  return adminEmails.includes(email);
} 