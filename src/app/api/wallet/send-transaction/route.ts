import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { sendTransaction } from "@/lib/wallet";
import { isValidPasscode } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";
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
    const { to, amount, passcode } = await req.json();

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
        mpcSalt: true
      },
    });

    if (!user || !user.solanaAddress) {
      return NextResponse.json(
        { error: "Wallet not set up" },
        { status: 400 }
      );
    }

    // Determine which type of wallet the user has (MPC or legacy)
    let keypair;

    if (user.usesMPC) {
      // MPC wallet approach
      if (!user.mpcServerShare || !user.mpcSalt) {
        return NextResponse.json(
          { error: "Wallet not set up properly" },
          { status: 400 }
        );
      }

      // Prepare the keypair using MPC (in a real implementation, this would use proper MPC)
      keypair = prepareMPCSigningKeypair(
        passcode,
        user.mpcServerShare,
        user.mpcSalt
      );

      if (!keypair) {
        return NextResponse.json(
          { error: "Invalid passcode" },
          { status: 401 }
        );
      }
    } else {
      // Legacy approach with encrypted mnemonic
      if (!user.encryptedKeypair) {
        return NextResponse.json(
          { error: "Wallet not set up properly" },
          { status: 400 }
        );
      }

      // Decrypt the mnemonic with the provided passcode
      const mnemonic = await decryptMnemonic(user.encryptedKeypair, passcode);

      if (!mnemonic) {
        return NextResponse.json(
          { error: "Invalid passcode" },
          { status: 401 }
        );
      }

      // Derive the keypair from the mnemonic
      keypair = getKeypairFromMnemonic(mnemonic);
    }

    // Convert the amount from SOL to lamports
    const amountInLamports = Math.floor(Number.parseFloat(amount) * LAMPORTS_PER_SOL);

    if (Number.isNaN(amountInLamports) || amountInLamports <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Create a record of the transaction request
    const transaction = await prisma.transaction.create({
      data: {
        txData: JSON.stringify({ to, amount }),
        status: "pending",
        user: {
          connect: { id: user.id }
        }
      },
    });

    // Send the transaction
    try {
      const { signature } = await sendTransaction(keypair, to, amountInLamports);

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
        message: "Transaction sent successfully",
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
    console.error("Error sending transaction:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send transaction";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  } finally {
    // Close the Prisma client connection
    await prisma.$disconnect();
  }
}
