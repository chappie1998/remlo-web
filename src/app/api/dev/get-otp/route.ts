import { NextRequest, NextResponse } from "next/server";
import { getSimulatedOTP } from "@/lib/otp";

// This endpoint is for development purposes only and should be disabled in production
export async function GET(request: NextRequest) {
  // Only allow this endpoint in development mode
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const otp = getSimulatedOTP(email);

  if (!otp) {
    return NextResponse.json({ error: "No OTP found or OTP expired" }, { status: 404 });
  }

  return NextResponse.json({ email, otp });
}
