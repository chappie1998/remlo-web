import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { decryptMnemonic } from "@/lib/crypto";
import { isValidPasscode } from "@/lib/utils";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "You must be signed in to verify your passcode" },
        { status: 401 }
      );
    }

    // Get the passcode from the request
    const { passcode } = await req.json();

    if (!isValidPasscode(passcode)) {
      return NextResponse.json(
        { error: "Passcode must be 6 digits" },
        { status: 400 }
      );
    }

    // Get the user's encrypted mnemonic (stored in encryptedKeypair field)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { encryptedKeypair: true },
    });

    if (!user || !user.encryptedKeypair) {
      return NextResponse.json(
        { error: "Wallet not set up" },
        { status: 400 }
      );
    }

    // Try to decrypt the mnemonic with the provided passcode
    const mnemonic = await decryptMnemonic(user.encryptedKeypair, passcode);

    if (!mnemonic) {
      return NextResponse.json(
        { error: "Invalid passcode" },
        { status: 401 }
      );
    }

    // If we get here, the passcode is valid
    return NextResponse.json({
      success: true,
      verified: true,
    });
  } catch (error) {
    console.error("Error verifying passcode:", error);
    return NextResponse.json(
      { error: "Failed to verify passcode" },
      { status: 500 }
    );
  }
}
