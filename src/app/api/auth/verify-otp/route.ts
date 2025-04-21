import { NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "@/lib/otp";
import { createHash } from "crypto";
import { User, Session } from "@/lib/mongodb";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    // Connect to the database
    await connectToDatabase();

    // Verify the OTP
    const isValid = await verifyOTP(email, otp);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // Get or create user
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        emailVerified: new Date(),
      });
    } else {
      user = await User.findOneAndUpdate(
        { email },
        { emailVerified: new Date() },
        { new: true }
      );
    }

    // Create session token
    const sessionToken = createHash("sha256")
      .update(`${user._id}-${Date.now()}-${Math.random()}`)
      .digest("hex");

    // Set expiry to 30 days
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    // Create session in database
    await Session.create({
      sessionToken,
      userId: user._id,
      expires,
    });

    // Return success
    return NextResponse.json({ success: true, userId: user._id.toString() });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
