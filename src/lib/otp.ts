import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

// Store OTPs in memory for simulation (this will be lost on server restart)
const otpSimulationStore: Record<string, { otp: string; email: string; createdAt: Date; attempts: number }> = {};

// Config constants
const OTP_EXPIRY_MINUTES = 5; // Shorter expiry time for security
const OTP_LENGTH = 6; // Standard 6-digit OTP
const MAX_OTP_ATTEMPTS = 3; // Max verification attempts before requiring a new OTP

// Generate a cryptographically secure random OTP
export function generateOTP(): string {
  // Use crypto.randomInt for better randomness than Math.random
  const min = 10 ** (OTP_LENGTH - 1); // 100000 for 6 digits
  const max = 10 ** OTP_LENGTH - 1; // 999999 for 6 digits

  try {
    // Secure random number generation
    const otp = crypto.randomInt(min, max + 1).toString().padStart(OTP_LENGTH, '0');
    return otp;
  } catch (error) {
    // Fallback in case crypto.randomInt is not available
    console.warn("Crypto.randomInt not available, using less secure fallback");
    return Math.floor(min + Math.random() * (max - min + 1)).toString().padStart(OTP_LENGTH, '0');
  }
}

// Simulate sending email with OTP (log to console instead)
export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  // Store the OTP for simulation with tracking for attempts
  otpSimulationStore[email] = {
    otp,
    email,
    createdAt: new Date(),
    attempts: 0
  };

  // Log the OTP to console for testing
  console.log(`===== SIMULATED EMAIL =====`);
  console.log(`To: ${email}`);
  console.log(`Subject: Your Solana Wallet OTP`);
  console.log(`Body: Your OTP for Solana Passcode Wallet is: ${otp}`);
  console.log(`This code will expire in ${OTP_EXPIRY_MINUTES} minutes.`);
  console.log(`=========================`);

  // In a real app, we would send an actual email here
  // But for this simulation, we're just logging it
}

// Get the most recent simulated OTP for an email (for development purposes only)
export function getSimulatedOTP(email: string): string | null {
  const record = otpSimulationStore[email];
  if (!record) return null;

  // Check if OTP is expired
  const expiryTime = new Date();
  expiryTime.setMinutes(expiryTime.getMinutes() - OTP_EXPIRY_MINUTES);

  if (record.createdAt < expiryTime) {
    // OTP expired
    delete otpSimulationStore[email];
    return null;
  }

  // Check if too many attempts
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    delete otpSimulationStore[email];
    return null;
  }

  return record.otp;
}

// Create a new OTP in the database
export async function createOTP(email: string): Promise<string> {
  // Generate OTP
  const otp = generateOTP();

  // Set expiry time to configured minutes from now
  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() + OTP_EXPIRY_MINUTES);

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
  // Implement rate limiting for OTP verification
  if (otpSimulationStore[email]) {
    otpSimulationStore[email].attempts += 1;

    // If too many attempts, invalidate the OTP
    if (otpSimulationStore[email].attempts > MAX_OTP_ATTEMPTS) {
      delete otpSimulationStore[email];
    }
  }

  // Add a small delay to prevent timing attacks (300-500ms)
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));

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
