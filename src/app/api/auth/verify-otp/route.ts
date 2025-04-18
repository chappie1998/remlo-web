import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyOTP } from "@/lib/otp";
import { createHash } from "crypto";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    // Verify the OTP
    const isValid = await verifyOTP(email, otp);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // Get or create user
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        emailVerified: new Date(),
      },
      create: {
        email,
        emailVerified: new Date(),
      },
    });

    // Create session token
    const sessionToken = createHash("sha256")
      .update(`${user.id}-${Date.now()}-${Math.random()}`)
      .digest("hex");

    // Set expiry to 30 days
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    // Create session in database
    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires,
      },
    });

    // Return success
    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
