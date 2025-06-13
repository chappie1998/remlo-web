import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { decryptMnemonic } from "@/lib/crypto";
import { isValidPasscode } from "@/lib/utils";
import { verifyPasscodeForMPC } from "@/lib/mpc";
import { authOptions } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/jwt";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    let userEmail = null;

    // First, try to get the session from NextAuth
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      userEmail = session.user.email;
    }

    // If no NextAuth session, try to get the user from JWT token (mobile app)
    if (!userEmail) {
      const userData = await getUserFromRequest(req);
      if (userData?.email) {
        userEmail = userData.email;
      }
    }

    if (!userEmail) {
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

    // Get the user's wallet information
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        encryptedKeypair: true,
        usesMPC: true,
        mpcServerShare: true,
        mpcSalt: true,
        mpcBackupShare: true  // Include backup share for verification
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 400 }
      );
    }

    // Check if the user has a wallet set up
    if (user.usesMPC) {
      // User is using MPC
      if (!user.mpcServerShare || !user.mpcSalt) {
        return NextResponse.json(
          { error: "Wallet not set up properly" },
          { status: 400 }
        );
      }

      // Verify the passcode using MPC with backup share for more thorough verification
      const isValid = await verifyPasscodeForMPC(
        passcode,
        user.mpcServerShare,
        user.mpcSalt,
        user.mpcBackupShare || undefined  // Convert null to undefined for TypeScript compatibility
      );

      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid passcode" },
          { status: 401 }
        );
      }
    } else {
      // Legacy approach - using encrypted mnemonic
      if (!user.encryptedKeypair) {
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
  } finally {
    await prisma.$disconnect();
  }
}
