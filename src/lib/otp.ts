import { PrismaClient } from "@prisma/client";
import { createTransport } from "nodemailer";

const prisma = new PrismaClient();

// Generate a random 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send email with OTP
export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  const transport = createTransport({
    host: process.env.EMAIL_SERVER_HOST || "localhost",
    port: Number(process.env.EMAIL_SERVER_PORT) || 1025,
    auth: {
      user: process.env.EMAIL_SERVER_USER || "",
      pass: process.env.EMAIL_SERVER_PASSWORD || "",
    },
  });

  await transport.sendMail({
    from: process.env.EMAIL_FROM || "noreply@solanawallet.app",
    to: email,
    subject: "Your Solana Wallet OTP",
    text: `Your OTP for Solana Passcode Wallet is: ${otp}. It will expire in 10 minutes.`,
    html: `
      <div style="padding: 20px; background-color: #1e1e1e; color: #ffffff;">
        <h2 style="color: #ffffff;">Your OTP for Solana Passcode Wallet</h2>
        <div style="background-color: #2e2e2e; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
          <h1 style="font-size: 36px; margin: 10px 0; color: #ffffff;">${otp}</h1>
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this OTP, please ignore this email.</p>
      </div>
    `,
  });
}

// Create a new OTP in the database
export async function createOTP(email: string): Promise<string> {
  // Generate OTP
  const otp = generateOTP();

  // Set expiry time to 10 minutes from now
  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() + 10);

  // Delete any existing OTP for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

  // Save the OTP in the database
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: otp,
      expires: expiryDate,
    },
  });

  return otp;
}

// Verify an OTP
export async function verifyOTP(email: string, otp: string): Promise<boolean> {
  const otpRecord = await prisma.verificationToken.findFirst({
    where: {
      identifier: email,
      token: otp,
      expires: {
        gt: new Date(),
      },
    },
  });

  if (!otpRecord) {
    return false;
  }

  // Delete the OTP record to prevent reuse
  await prisma.verificationToken.delete({
    where: {
      identifier_token: {
        identifier: email,
        token: otp,
      },
    },
  });

  return true;
}
