import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/jwt";
import { 
  canTransferBetweenUsers, 
  createUniversalTransaction,
  findUserByUsername 
} from "@/lib/universal-wallet";

const prisma = new PrismaClient();

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    let userEmail = null;
    const session = await getServerSession(authOptions);
    
    if (session?.user?.email) {
      userEmail = session.user.email;
    } else {
      const userData = await getUserFromRequest(req);
      if (userData?.email) {
        userEmail = userData.email;
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get sender user data
    const sender = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, username: true }
    });

    if (!sender) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const { 
      recipientUsername, 
      amount, 
      tokenSymbol, 
      note 
    } = await req.json();

    // Validate inputs
    if (!recipientUsername || !amount || !tokenSymbol) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if transfer is possible
    const transferCheck = await canTransferBetweenUsers(
      sender.id,
      recipientUsername,
      tokenSymbol
    );

    if (!transferCheck.possible) {
      return NextResponse.json(
        { error: transferCheck.reason || "Transfer not possible" },
        { status: 400 }
      );
    }

    // Get recipient data
    const recipient = await findUserByUsername(recipientUsername);
    if (!recipient) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    // Create universal transaction record
    const transactionId = await createUniversalTransaction({
      userId: sender.id,
      recipientUserId: recipient.id,
      recipientUsername: recipient.username,
      amount,
      tokenSymbol,
      blockchain: transferCheck.route!,
      network: transferCheck.route === 'solana' ? 'devnet' : 'base-sepolia',
      note,
    });

    // Return transaction details for frontend to execute
    const response = {
      success: true,
      transactionId,
      route: transferCheck.route,
      recipient: {
        username: recipient.username,
        solanaAddress: recipient.solanaAddress,
        baseAddress: recipient.baseAddress,
      },
      amount,
      tokenSymbol,
      blockchain: transferCheck.route,
      message: `Transfer prepared via ${transferCheck.route} blockchain`,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error("Universal send error:", error);
    return NextResponse.json(
      { error: "Transfer preparation failed" },
      { status: 500 }
    );
  }
} 