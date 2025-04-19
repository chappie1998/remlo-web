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

      // If the client provided their own backup and recovery shares, use those
      // Otherwise, use the server's stored backup share for 3-part reconstruction
      const clientBackupShare = backupShare || user.mpcBackupShare;

      console.log(`Attempting MPC signing with ${clientBackupShare ? 'backup share' : 'no backup share'}`);

      // Prepare the keypair using MPC with 3 shares
      try {
        keypair = prepareMPCSigningKeypair(
          passcode,
          user.mpcServerShare,
          user.mpcSalt,
          clientBackupShare,
          recoveryShare // This might be undefined, which is fine
        );

        if (!keypair) {
          console.error("MPC signing preparation returned null");
          return NextResponse.json(
            { error: "Invalid passcode or shares" },
            { status: 401 }
          );
        }

        // Verify the keypair corresponds to the user's address
        const keypairAddress = keypair.publicKey.toBase58();
        if (keypairAddress !== user.solanaAddress) {
          console.error(`Address mismatch: expected ${user.solanaAddress}, got ${keypairAddress}`);
          return NextResponse.json(
            { error: "Generated keypair does not match wallet address" },
            { status: 401 }
          );
        }
      } catch (mpError) {
        console.error("Error in MPC signing preparation:", mpError);
        return NextResponse.json(
          { error: mpError instanceof Error ? mpError.message : "Failed to prepare MPC signing" },
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
