import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { SPL_TOKEN_ADDRESS, isValidSolanaAddress } from "@/lib/solana";
import { isValidPasscode } from "@/lib/utils";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Get the current session - pass in the auth options
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "You must be signed in to send a transaction" },
        { status: 401 }
      );
    }

    // Get transaction details and passcode from the request
    const { to, amount, passcode } = await req.json();

    if (!to || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: to, amount" },
        { status: 400 }
      );
    }

    if (!isValidSolanaAddress(to)) {
      return NextResponse.json(
        { error: "Invalid recipient address" },
        { status: 400 }
      );
    }

    if (!isValidPasscode(passcode)) {
      return NextResponse.json(
        { error: "Passcode must be 6 digits" },
        { status: 400 }
      );
    }

    // Get the user's wallet information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        solanaAddress: true,
      },
    });

    if (!user || !user.solanaAddress) {
      return NextResponse.json(
        { error: "Wallet not set up" },
        { status: 400 }
      );
    }

    // Create a record of the transaction request
    const transaction = await prisma.transaction.create({
      data: {
        txData: JSON.stringify({ to, amount, token: SPL_TOKEN_ADDRESS }),
        status: "pending",
        user: {
          connect: { id: user.id }
        }
      },
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate a fake signature
    const fakeSig = `${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

    // Update the transaction record with the executed status and signature
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: "executed",
        signature: fakeSig,
        executedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      signature: fakeSig,
      message: "Transaction sent successfully via relayer",
    });
  } catch (error) {
    console.error("Error sending token transaction:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send token transaction";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  } finally {
    // Close the Prisma client connection
    await prisma.$disconnect();
  }
}
