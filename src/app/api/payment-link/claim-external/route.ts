import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma-client";
import { verifyPaymentLinkOTP, generatePaymentLinkOTP } from "@/lib/paymentLinkUtils"; // Assuming generatePaymentLinkOTP is also needed for debugging/logging as in verify
import { transferApprovedTokens } from "@/lib/tokenDelegation";
import { isValidSolanaAddress } from "@/lib/solana"; // For validating targetAddress

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const requestData = await req.json();
    console.log("Payment link claim-external request:", JSON.stringify(requestData, null, 2));
    
    const { shortId, otp, targetAddress } = requestData;

    if (!shortId) {
      return NextResponse.json({ error: "Payment link ID is required" }, { status: 400 });
    }
    if (!targetAddress || !isValidSolanaAddress(targetAddress)) {
      return NextResponse.json({ error: "Valid target Solana address is required" }, { status: 400 });
    }

    const cleanedOtp = otp ? otp.toString().trim().replace(/\D/g, '') : '';
    if (!cleanedOtp || cleanedOtp.length !== 6 || !/^\d+$/.test(cleanedOtp)) {
      console.error("OTP Validation Failed Details (Attempt 2):", {
        originalOtp: otp,
        cleanedOtp: cleanedOtp,
        cleanedOtpLength: cleanedOtp ? cleanedOtp.length : 'null_or_empty',
        isOnlyDigitsTestResult: cleanedOtp ? /^\d+$/.test(cleanedOtp) : 'not_tested',
        conditionParts: {
          isEmpty: !cleanedOtp,
          isLengthNot6: cleanedOtp ? cleanedOtp.length !== 6 : 'not_tested',
          isNotOnlyDigits: cleanedOtp ? !/^\d+$/.test(cleanedOtp) : 'not_tested'
        }
      });
      return NextResponse.json({ error: "OTP must be exactly 6 digits", receivedOtp: otp, cleanedOtpValue: cleanedOtp }, { status: 400 });
    }

    // Find the payment link using Prisma Client for better type safety and less raw SQL
    const paymentLink = await prisma.paymentLink.findUnique({
      where: { shortId: shortId },
      include: {
        creator: { // Include creator to get their Solana address
          select: {
            solanaAddress: true,
            id: true // For checking if creator is trying to claim (though less relevant for public links)
          }
        }
      }
    });
    
    if (!paymentLink) {
      return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
    }

    const creatorSolanaAddress = paymentLink.creator?.solanaAddress;

    if (!creatorSolanaAddress) {
        // This case should ideally not happen if link creation enforces creator address
        return NextResponse.json({ error: "Creator's Solana address not found for this link" }, { status: 500 });
    }
    
    // Check if the link is expired
    if (new Date(paymentLink.expiresAt) < new Date()) {
      // Optionally update status to 'expired' in DB
      await prisma.paymentLink.update({
        where: { id: paymentLink.id },
        data: { status: 'expired' }
      });
      return NextResponse.json({ error: "Payment link has expired" }, { status: 400 });
    }

    if (paymentLink.status === "claimed") {
      return NextResponse.json({ error: "Payment link has already been claimed" }, { status: 400 });
    }

    if (paymentLink.status !== "active") {
      return NextResponse.json({ error: `Payment link is ${paymentLink.status}, not active` }, { status: 400 });
    }
    
    // Prevent creator from claiming their own link via this external public method if desired,
    // though for public links this might be acceptable depending on use case.
    // For now, let's assume it's okay or handled by OTP.

    const creationTimestamp = paymentLink.createdAt.getTime();
    
    // For debugging, similar to verify route
    const regeneratedOTP = generatePaymentLinkOTP(
      paymentLink.shortId, 
      paymentLink.amount.toString(), // Pass amount as string
      creationTimestamp
    ).otp;
    console.log(`OTP Details - Provided: ${cleanedOtp}, Regenerated (for debug): ${regeneratedOTP}, Stored Verification Data: ${paymentLink.verificationData}`);

    const isValid = verifyPaymentLinkOTP(
      cleanedOtp,
      paymentLink.shortId,
      paymentLink.amount.toString(), // Pass amount as string
      creationTimestamp,
      paymentLink.verificationData
    );

    if (!isValid) {
      console.error("OTP verification failed for claim-external:", { providedOtp: cleanedOtp, shortId: paymentLink.shortId });
      // In a real scenario, you might want to implement rate limiting or temporary lockouts here
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }
    console.log("✅ OTP verification successful for claim-external!");

    // Proceed with token transfer
    console.log("Initiating token transfer (claim-external):", {
      from: creatorSolanaAddress,
      to: targetAddress,
      amount: parseFloat(paymentLink.amount.toString()), // parseFloat is correct here for transferApprovedTokens
      tokenType: paymentLink.tokenType
    });

    const transferResult = await transferApprovedTokens(
      creatorSolanaAddress,
      targetAddress,
      parseFloat(paymentLink.amount.toString()), // parseFloat is correct here
      paymentLink.tokenType.toLowerCase()
    );

    if (!transferResult.success || !transferResult.signature) {
      console.error("Token transfer failed (claim-external):", transferResult.error);
      return NextResponse.json({ error: transferResult.error || "Token transfer failed during claim" }, { status: 500 });
    }
    
    console.log(`✅ Token transfer successful (claim-external). Signature: ${transferResult.signature}`);

    // Update payment link status to claimed
    const updatedPaymentLink = await prisma.paymentLink.update({
      where: { id: paymentLink.id },
      data: {
        status: 'claimed',
        claimedBy: targetAddress, // Store the external address that claimed
        claimedAt: new Date(),
        claimedTransactionId: transferResult.signature // Store the transaction ID
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Payment successfully claimed to external wallet!",
      transactionId: transferResult.signature,
      claimedAmount: updatedPaymentLink.amount,
      tokenType: updatedPaymentLink.tokenType
    });

  } catch (error: any) {
    console.error("Error in /api/payment-link/claim-external:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
} 