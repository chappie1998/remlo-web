import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { decryptMnemonic } from "@/lib/crypto";
import { isValidPasscode } from "@/lib/utils";
import { verifyPasscodeForMPC } from "@/lib/mpc";
import { authOptions } from "@/lib/auth";
import { User } from "@/lib/mongodb";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    // Get the current session - pass in the auth options
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "You must be signed in to verify your passcode" },
        { status: 401 }
      );
    }

    // Connect to the database
    await connectToDatabase();

    // Get the passcode from the request
    const { passcode } = await req.json();

    if (!isValidPasscode(passcode)) {
      return NextResponse.json(
        { error: "Passcode must be 6 digits" },
        { status: 400 }
      );
    }

    // Get the user's wallet information
    const user = await User.findOne(
      { email: session.user.email },
      {
        encryptedKeypair: 1,
        usesMPC: 1,
        mpcServerShare: 1,
        mpcSalt: 1,
        mpcBackupShare: 1  // Include backup share for verification
      }
    );

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
        user.mpcBackupShare  // Include backup share for better verification
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
  }
}
