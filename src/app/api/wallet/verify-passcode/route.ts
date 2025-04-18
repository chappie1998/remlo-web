import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { decryptKeypair } from "@/lib/wallet";
import { isValidPasscode } from "@/lib/utils";

const prisma = new PrismaClient();

// Store failed attempts in memory
// In production, use Redis or another persistent store
const failedAttempts: Record<string, { count: number; lockedUntil?: Date }> = {};

// Rate limiting constants
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

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

    const email = session.user.email;

    // Check if user is currently locked out
    const userAttempts = failedAttempts[email] || { count: 0 };

    if (userAttempts.lockedUntil && userAttempts.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (userAttempts.lockedUntil.getTime() - Date.now()) / (1000 * 60)
      );

      return NextResponse.json(
        {
          error: `Too many failed attempts. Please try again in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}.`,
          lockedUntil: userAttempts.lockedUntil
        },
        { status: 429 }
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

    // Get the user's encrypted keypair
    const user = await prisma.user.findUnique({
      where: { email },
      select: { encryptedKeypair: true },
    });

    if (!user || !user.encryptedKeypair) {
      return NextResponse.json(
        { error: "Wallet not set up" },
        { status: 400 }
      );
    }

    // Try to decrypt the keypair with the provided passcode
    const keypair = decryptKeypair(user.encryptedKeypair, passcode);

    if (!keypair) {
      // Track failed attempt
      userAttempts.count += 1;

      // Check if we should lock the account
      if (userAttempts.count >= MAX_ATTEMPTS) {
        const lockoutTime = new Date();
        lockoutTime.setMinutes(lockoutTime.getMinutes() + LOCKOUT_DURATION_MINUTES);
        userAttempts.lockedUntil = lockoutTime;

        failedAttempts[email] = userAttempts;

        return NextResponse.json(
          {
            error: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
            lockedUntil: lockoutTime
          },
          { status: 429 }
        );
      }

      failedAttempts[email] = userAttempts;

      return NextResponse.json(
        {
          error: `Invalid passcode. ${MAX_ATTEMPTS - userAttempts.count} attempts remaining.`,
          attemptsRemaining: MAX_ATTEMPTS - userAttempts.count
        },
        { status: 401 }
      );
    }

    // If we get here, the passcode is valid
    // Reset failed attempts counter
    if (failedAttempts[email]) {
      delete failedAttempts[email];
    }

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
