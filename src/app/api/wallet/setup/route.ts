import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { generateKeypair, encryptKeypair } from "@/lib/wallet";
import { isValidPasscode } from "@/lib/utils";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "You must be signed in to set up a wallet" },
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

    // Generate a keypair for the user based on their email
    const keypair = generateKeypair(session.user.email);

    // Get the public key (address)
    const solanaAddress = keypair.publicKey.toString();

    // Encrypt the keypair with the passcode
    const encryptedKeypair = encryptKeypair(keypair, passcode);

    // Update the user record with the wallet address and encrypted keypair
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        solanaAddress,
        encryptedKeypair,
        hasPasscode: true,
        passcodeSetAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      solanaAddress,
    });
  } catch (error) {
    console.error("Error setting up wallet:", error);
    return NextResponse.json(
      { error: "Failed to set up wallet" },
      { status: 500 }
    );
  }
}
