import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { isValidPasscode } from "@/lib/utils";
import { validateMnemonic } from "@/lib/crypto";
import { createMPCWallet } from "@/lib/mpc";

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

    // Validate that the mnemonic is a valid BIP-39 phrase (if provided)
    if (mnemonic && !validateMnemonic(mnemonic)) {
      return NextResponse.json(
        { error: "Invalid recovery phrase" },
        { status: 400 }
      );
    }

    // Create a new MPC wallet with 3-part secret sharing
    const { publicKey, serverShare, backupShare, recoveryShare, salt } = createMPCWallet(passcode);

    // Update the user record with the wallet address and MPC information
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        solanaAddress: publicKey,
        mpcServerShare: serverShare,
        mpcSalt: salt,
        mpcBackupShare: backupShare, // In production, this would be stored more securely or given to user
        usesMPC: true,
        hasPasscode: true,
        passcodeSetAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      solanaAddress: publicKey,
      // Include both backup shares in the response for the user to save securely
      backupShare,
      recoveryShare, // Additional share for more recovery options
    });
  } catch (error) {
    console.error("Error setting up wallet:", error);
    return NextResponse.json(
      { error: "Failed to set up wallet" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
