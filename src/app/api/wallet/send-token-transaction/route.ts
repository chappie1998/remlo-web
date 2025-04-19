import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { SPL_TOKEN_ADDRESS, RELAYER_URL, isValidSolanaAddress } from "@/lib/solana";
import { isValidPasscode } from "@/lib/utils";
import { decryptMnemonic, getKeypairFromMnemonic } from "@/lib/crypto";
import { prepareMPCSigningKeypair } from "@/lib/mpc";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "You must be signed in to send a transaction" },
        { status: 401 }
      );
    }

    // Get transaction details and passcode from the request
    const { to, amount, passcode, backupShare, recoveryShare } = await req.json();

    if (!to || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: to, amount" },
        { status: 400 }
      );
    }

    if (!isValidSolanaAddress(to)) {
      return NextResponse.json(
        { error: "Invalid recipient address" },
        { status: 400 }
      );
    }

    if (!isValidPasscode(passcode)) {
      return NextResponse.json(
        { error: "Passcode must be 6 digits" },
        { status: 400 }
      );
    }

    // Get the user's wallet information
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        encryptedKeypair: true,
        solanaAddress: true,
        usesMPC: true,
        mpcServerShare: true,
        mpcSalt: true,
        mpcBackupShare: true
      },
    });

    if (!user || !user.solanaAddress) {
      return NextResponse.json(
        { error: "Wallet not set up" },
        { status: 400 }
      );
    }

    // Create a record of the transaction request
    const transaction = await prisma.transaction.create({
      data: {
        txData: JSON.stringify({ to, amount, token: SPL_TOKEN_ADDRESS }),
        status: "pending",
        user: {
          connect: { id: user.id }
        }
      },
    });

    try {
      // Step 1: Create a transaction through the relayer
      const createTxResponse = await fetch(`${RELAYER_URL}/api/create-transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromAddress: user.solanaAddress,
          toAddress: to,
          amount: amount,
        }),
      });

      if (!createTxResponse.ok) {
        const errorData = await createTxResponse.json();
        throw new Error(errorData.error || "Failed to create transaction via relayer");
      }

      const { transactionData } = await createTxResponse.json();

      // Step 2: Sign the transaction with the user's keypair
      // Need to implement the signing logic here
      let signature;

      // Step 3: Submit the signed transaction via the relayer
      const submitTxResponse = await fetch(`${RELAYER_URL}/api/submit-transaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signedTransaction: transactionData, // Ideally, this should be signed first
        }),
      });

      if (!submitTxResponse.ok) {
        const errorData = await submitTxResponse.json();
        throw new Error(errorData.error || "Failed to submit transaction via relayer");
      }

      const submitResult = await submitTxResponse.json();
      signature = submitResult.signature;

      // Update the transaction record with the executed status and signature
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "executed",
          signature,
          executedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        signature,
        message: "Transaction sent successfully via relayer",
      });
    } catch (txError) {
      // Update the transaction record with the rejected status
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "rejected",
        },
      });

      console.error("Transaction failed:", txError);
      const errorMessage = txError instanceof Error ? txError.message : "Transaction failed to execute";
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending token transaction:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send token transaction";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  } finally {
    // Close the Prisma client connection
    await prisma.$disconnect();
  }
}
