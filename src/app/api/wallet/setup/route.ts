import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { isValidPasscode } from "@/lib/utils";
import { getKeypairFromMnemonic, validateMnemonic, encryptMnemonic } from "@/lib/crypto";

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

    // Get the passcode and mnemonic from the request
    const { passcode, mnemonic } = await req.json();

    if (!isValidPasscode(passcode)) {
      return NextResponse.json(
        { error: "Passcode must be 6 digits" },
        { status: 400 }
      );
    }

    // Validate that the mnemonic is a valid BIP-39 phrase
    if (!mnemonic || !validateMnemonic(mnemonic)) {
      return NextResponse.json(
        { error: "Invalid recovery phrase" },
        { status: 400 }
      );
    }

    // Derive a keypair from the mnemonic using HD wallet standards
    const keypair = getKeypairFromMnemonic(mnemonic);

    // Get the public key (address)
    const solanaAddress = keypair.publicKey.toString();

    // Encrypt the mnemonic with the passcode using secure methods
    const encryptedMnemonic = await encryptMnemonic(mnemonic, passcode);

    // Update the user record with the wallet address and encrypted mnemonic
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        solanaAddress,
        encryptedKeypair: encryptedMnemonic, // Store the encrypted mnemonic in the existing column
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
