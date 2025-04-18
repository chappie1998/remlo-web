import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Store OTPs in memory for simulation (this will be lost on server restart)
const otpSimulationStore: Record<string, { otp: string; email: string; createdAt: Date }> = {};

// Generate a random 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simulate sending email with OTP (log to console instead)
export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  // Store the OTP for simulation
  otpSimulationStore[email] = {
    otp,
    email,
    createdAt: new Date()
  };

  // Log the OTP to console for testing
  console.log(`===== SIMULATED EMAIL =====`);
  console.log(`To: ${email}`);
  console.log(`Subject: Your Solana Wallet OTP`);
  console.log(`Body: Your OTP for Solana Passcode Wallet is: ${otp}`);
  console.log(`=========================`);

  // In a real app, we would send an actual email here
  // But for this simulation, we're just logging it
}

// Get the most recent simulated OTP for an email (for development purposes only)
export function getSimulatedOTP(email: string): string | null {
  const record = otpSimulationStore[email];
  if (!record) return null;

  // Check if OTP is older than 10 minutes
  const tenMinutesAgo = new Date();
  tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

  if (record.createdAt < tenMinutesAgo) {
    // OTP expired
    delete otpSimulationStore[email];
    return null;
  }

  return record.otp;
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
