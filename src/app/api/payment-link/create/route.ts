import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { 
  generatePaymentLinkId, 
  generatePaymentLinkOTP, 
  calculateExpirationDate 
} from "@/lib/paymentLinkUtils";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { prepareMPCSigningKeypair } from "@/lib/mpc";
import { sign } from "tweetnacl";
import { isValidPasscode } from "@/lib/utils";
import { APP_URL, RELAYER_URL as CONFIG_RELAYER_URL } from "@/lib/config";
import crypto from "crypto";

// Configure Solana connection
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Token mint addresses
const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT || 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');
const USDS_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDS_MINT || 'DK6BeZv3ZxWXiSFUAL7s3wAiEPndBR3D4hL4jKfyXjLV');

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    // Get the session from NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to create a payment link" },
        { status: 401 }
      );
    }

    // Get request data
    const { amount, tokenType, note, expiresIn, passcode } = await req.json();

    // Validate amount
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Validate token type
    if (!["usds", "usdc"].includes(tokenType.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid token type. Supported types: usds, usdc" },
        { status: 400 }
      );
    }

    // Validate passcode
    if (!isValidPasscode(passcode)) {
      return NextResponse.json(
        { error: "Passcode must be exactly 6 digits" },
        { status: 400 }
      );
    }

    // Find the creator user
    const creator = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        solanaAddress: true,
        usesMPC: true,
        mpcServerShare: true,
        mpcSalt: true,
        mpcBackupShare: true
      }
    });

    if (!creator) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!creator.solanaAddress) {
      return NextResponse.json(
        { error: "User does not have a Solana address" },
        { status: 400 }
      );
    }

    // Validate MPC wallet setup
    if (!creator.usesMPC || !creator.mpcServerShare || !creator.mpcSalt) {
      return NextResponse.json(
        { error: "Wallet not set up properly" },
        { status: 400 }
      );
    }

    // Generate a short ID for the payment link
    const shortId = generatePaymentLinkId();
    
    // Calculate expiration date (default 24 hours if not provided)
    const expiresAt = calculateExpirationDate(expiresIn ? parseInt(expiresIn) : 24);
    
    // Generate OTP and verification data
    const timestamp = Date.now();
    const { otp, verificationData } = generatePaymentLinkOTP(shortId, amount, timestamp);
    
    // Log the OTP and verification data for debugging
    console.log("Generated OTP and verification data:", {
      shortId,
      otp,
      timestamp,
      verificationDataLength: verificationData.length,
      verificationDataPreview: verificationData.substring(0, 20) + '...' + (verificationData.includes(':') ? ` [contains separator at pos ${verificationData.indexOf(':')}]` : ' [no separator]')
    });

    // Convert amount to token units (using 6 decimals for tokens)
    const TOKEN_DECIMALS = 6;
    const amountInUnits = Math.floor(Number(amount) * (10 ** TOKEN_DECIMALS));

    console.log(`Creating token transfer: ${amount} tokens (${amountInUnits} units with ${TOKEN_DECIMALS} decimals)`);

    // Check if the user has a token account for the selected token
    const userPublicKey = new PublicKey(creator.solanaAddress);
    const tokenMint = tokenType.toLowerCase() === 'usdc' ? USDC_MINT : USDS_MINT;
    const tokenAccount = await getAssociatedTokenAddress(tokenMint, userPublicKey);
    
    let hasTokenAccount = false;
    try {
      // Check if the token account exists
      const account = await getAccount(connection, tokenAccount);
      console.log(`User has existing ${tokenType.toUpperCase()} token account with balance:`, account.amount.toString());
      hasTokenAccount = true;
    } catch (error) {
      console.log(`No ${tokenType.toUpperCase()} token account found, will be created during delegation`);
      
      // We don't need to fail here - the relayer will create the token account if needed
      // when executing the delegation. This is a softer approach that lets users
      // create payment links even before they've received any tokens of this type.
    }
    
    // Only verify a minimum balance if the token account exists
    if (hasTokenAccount) {
      try {
        // Verify the user has at least the specified amount of tokens
        const account = await getAccount(connection, tokenAccount);
        const userBalance = Number(account.amount);
        const requiredAmount = amountInUnits;
        
        if (userBalance < requiredAmount) {
          return NextResponse.json(
            { error: `Insufficient ${tokenType.toUpperCase()} balance. Required: ${amount}, Available: ${userBalance / (10 ** TOKEN_DECIMALS)}` },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error("Error verifying token balance:", error);
      }
    }

    // Prepare the keypair using MPC
    const keypair = prepareMPCSigningKeypair(
      passcode,
      creator.mpcServerShare,
      creator.mpcSalt,
      creator.mpcBackupShare || undefined
    );

    if (!keypair) {
      return NextResponse.json(
        { error: "Invalid passcode or unable to derive keypair" },
        { status: 401 }
      );
    }

    // Verify the keypair corresponds to the user's address
    const keypairAddress = keypair.publicKey.toBase58();
    if (keypairAddress !== creator.solanaAddress) {
      return NextResponse.json(
        { error: "Generated keypair does not match wallet address" },
        { status: 401 }
      );
    }

    // Create a record of the transaction request
    const transaction = await prisma.transaction.create({
      data: {
        txData: JSON.stringify({ amount, tokenType, note, shortId }),
        status: "pending",
        user: {
          connect: { id: creator.id }
        }
      },
    });

    // Request the token transfer transaction from the relayer (same as send-token-transaction)
    const createDelegationResponse = await fetch(`${CONFIG_RELAYER_URL}/api/create-delegation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fromAddress: creator.solanaAddress,
        amount: amount,
        amountInRawUnits: amountInUnits,
        tokenType: tokenType.toLowerCase()
      }),
    });

    console.log(`Relayer response status: ${createDelegationResponse.status}`);

    if (!createDelegationResponse.ok) {
      let errorMessage = "Failed to create delegation with relayer";
      try {
        const errorData = await createDelegationResponse.json();
        errorMessage = errorData.error || errorMessage;
        console.error("Relayer error details:", errorData);
      } catch (parseError) {
        console.error("Could not parse relayer error response:", parseError);
      }
      throw new Error(errorMessage);
    }

    const delegationData = await createDelegationResponse.json();
    const serializedTransaction = delegationData.transactionData;

    // Deserialize the transaction to sign it
    const transactionBuffer = Buffer.from(serializedTransaction, 'base64');
    const unsignedTransaction = Transaction.from(transactionBuffer);

    console.log("Received transaction for signing");

    // User signs the transaction
    console.log(`User signing transaction with address: ${keypair.publicKey.toString()}`);
    const messageToSign = unsignedTransaction.serializeMessage();
    const signature = sign.detached(messageToSign, keypair.secretKey);

    // Add the signature to the transaction
    unsignedTransaction.addSignature(keypair.publicKey, Buffer.from(signature));

    const serializedSignedTransaction = unsignedTransaction.serialize({
      verifySignatures: false,
      requireAllSignatures: false
    }).toString('base64');

    // Submit the signed transaction to the relayer
    const submitResponse = await fetch(`${CONFIG_RELAYER_URL}/api/submit-transaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        signedTransaction: serializedSignedTransaction,
      }),
    });

    console.log(`Relayer submit response status: ${submitResponse.status}`);

    if (!submitResponse.ok) {
      let errorMessage = "Failed to submit transaction to relayer";
      try {
        const errorData = await submitResponse.json();
        errorMessage = errorData.error || errorMessage;
        console.error("Relayer submit error details:", errorData);
      } catch (parseError) {
        console.error("Could not parse relayer submit error response:", parseError);
      }
      throw new Error(errorMessage);
    }

    const submitData = await submitResponse.json();
    const { signature: delegationTx } = submitData;

    // Update the transaction record with the executed status and signature
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: "executed",
        signature: delegationTx,
        executedAt: new Date(),
      },
    });

    // Create the payment link record using Prisma Client
    try {
      // Store a hard-coded OTP directly in the DB for testing
      // For debugging only - in production, this should be properly hashed
      const testVerificationData = verificationData + ":" + otp;
      
      console.log("Storing verification data in DB (via Prisma Client):", {
        originalData: verificationData,
        testData: testVerificationData, // This will be stored in verificationData field
        otp
      });

      const newPaymentLink = await prisma.paymentLink.create({
        data: {
          id: crypto.randomUUID(), // Prisma can autogenerate if not specified and @default(cuid()) or @default(uuid())
          shortId: shortId,
          creator: { connect: { id: creator.id } },
          amount: amount,
          tokenType: tokenType.toLowerCase(),
          note: note || "",
          status: "active",
          verificationData: testVerificationData, // Storing OTP concatenated for now as per original logic
          delegationTx: delegationTx,
          expiresAt: expiresAt, // Ensure this is a DateTime object
          // createdAt and updatedAt are usually handled by @default(now()) and @updatedAt
        }
      });

      // Construct the full payment link URL using APP_URL from config
      const paymentLinkUrl = `${APP_URL}/payment-link/${newPaymentLink.shortId}`;
      
      return NextResponse.json({
        success: true,
        paymentLink: {
          id: newPaymentLink.id,
          shortId: newPaymentLink.shortId,
          amount: newPaymentLink.amount,
          tokenType: newPaymentLink.tokenType,
          note: newPaymentLink.note,
          status: newPaymentLink.status,
          expiresAt: newPaymentLink.expiresAt,
          createdAt: newPaymentLink.createdAt,
          link: paymentLinkUrl,
          otp, // Include the OTP in the response (shown only once)
        }
      });
    } catch (error) {
      console.error("Error creating payment link in database (Prisma Client):", error);
      
      // Even if there's a database error, since the transaction was successful,
      // we'll return a success response with the payment link details
      const paymentLinkUrl = `${APP_URL}/payment-link/${shortId}`;
      
      return NextResponse.json({
        success: true,
        paymentLink: {
          id: crypto.randomUUID(),
          shortId,
          amount,
          tokenType: tokenType.toLowerCase(),
          note: note || "",
          status: "active",
          expiresAt,
          createdAt: new Date(),
          link: paymentLinkUrl,
          otp, // Include the OTP in the response (shown only once)
          warning: "Payment link was created, but there was an issue storing it in the database. Please use the link and OTP carefully as you may not be able to access them again."
        }
      });
    }
  } catch (error) {
    console.error("Error creating payment link:", error);
    return NextResponse.json(
      { error: "Failed to create payment link", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 