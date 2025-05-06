import crypto from 'crypto';

// Server secret key - in production, this should be stored in environment variables
const SERVER_SECRET = process.env.OTP_SERVER_SECRET || 'payment-link-secret-key-change-in-production';

/**
 * Generates a 6-digit OTP for payment links
 * @param linkId Unique ID of the payment link
 * @param amount Amount to be transferred
 * @param timestamp Creation timestamp for the link
 * @returns Object containing the OTP and verification data
 */
export function generatePaymentLinkOTP(
  linkId: string,
  amount: string,
  timestamp: number
): { otp: string; verificationData: string } {
  // Combine data with server secret to create a unique signature
  const secretKey = `${SERVER_SECRET}:${amount}:${timestamp}`;
  
  // Create HMAC of the linkId using the secret key
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(linkId);
  const hash = hmac.digest('hex');
  
  // Use the first 6 digits of the hash for the OTP
  // Converting to numeric OTP by taking substring and applying modulo
  const hashNum = parseInt(hash.substring(0, 12), 16);
  const sixDigitOTP = String(hashNum % 1000000).padStart(6, '0');
  
  // Store the OTP in the verification data with a separator
  // This ensures we use the exact same OTP for verification
  const verificationData = `${hash}:${sixDigitOTP}`;
  
  return {
    otp: sixDigitOTP,
    verificationData: verificationData
  };
}

/**
 * Verifies a provided OTP against the stored verification data
 * @param providedOTP The OTP provided by the user
 * @param linkId The ID of the payment link
 * @param amount The amount of the payment
 * @param timestamp The creation timestamp of the link
 * @param verificationData The stored verification data
 * @returns Boolean indicating if the OTP is valid
 */
export function verifyPaymentLinkOTP(
  providedOTP: string,
  linkId: string,
  amount: string,
  timestamp: number,
  verificationData: string
): boolean {
  try {
    // Clean the provided OTP to ensure it's exactly 6 digits
    const cleanedOTP = providedOTP.trim().padStart(6, '0');
    
    // Extract the stored OTP from verification data
    const parts = verificationData.split(':');
    const storedOTP = parts.length > 1 ? parts[1] : '';
    
    // If we have a stored OTP from the verification data, use it
    if (storedOTP) {
      console.log(`Using stored OTP: ${storedOTP}, Provided OTP: ${cleanedOTP}`);
      return storedOTP === cleanedOTP;
    }
    
    // Fallback to regenerating the OTP (legacy support)
    const { otp } = generatePaymentLinkOTP(linkId, amount, timestamp);
    
    // Debug logs
    console.log(`Regenerated OTP: ${otp}, Provided OTP: ${cleanedOTP}`);
    
    // Simple string comparison
    return otp === cleanedOTP;
  } catch (error) {
    console.error("Error in OTP verification:", error);
    return false;
  }
}

/**
 * Generate a short ID for payment links
 * @returns A unique short ID with the 'pl_' prefix
 */
export function generatePaymentLinkId(): string {
  // Use prefixed random bytes in base64, removing special chars and truncating
  return `pl_${crypto.randomBytes(8)
    .toString('base64')
    .replace(/[+/=]/g, '')
    .substring(0, 8)}`;
}

/**
 * Calculate expiration date based on hours from now
 * @param hours Number of hours until expiration
 * @returns Date object for the expiration time
 */
export function calculateExpirationDate(hours: number): Date {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hours);
  return expiresAt;
} 