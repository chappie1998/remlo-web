import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

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
    // Get the session from NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to list payment requests" },
        { status: 401 }
      );
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Extract the table name for debugging
    const tableNames = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
    console.log("Database tables:", tableNames);

    // List all payment requests created by this user
    const paymentRequests = await prisma.$transaction(async (tx) => {
      return await (tx as any).PaymentRequest.findMany({
        where: {
          creatorId: user.id
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    });

    console.log(`Found ${paymentRequests.length} payment requests for user`);

    // Count records for debugging
    const count = await prisma.$transaction(async (tx) => {
      return await (tx as any).PaymentRequest.count();
    });
    console.log("Total payment requests in database:", count);

    return NextResponse.json({
      success: true,
      paymentRequests: paymentRequests.map((pr: any) => ({
        id: pr.id,
        shortId: pr.shortId,
        amount: pr.amount,
        tokenType: pr.tokenType,
        note: pr.note,
        status: pr.status,
        expiresAt: pr.expiresAt,
        createdAt: pr.createdAt,
        link: `${process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin}/pay/${pr.shortId}`
      }))
    });
  } catch (error) {
    console.error("Error listing payment requests:", error);
    return NextResponse.json(
      { error: "Failed to list payment requests", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 