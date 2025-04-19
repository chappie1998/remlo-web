import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { Keypair, Transaction } from "@solana/web3.js";
import { isValidPasscode } from "@/lib/utils";
import { isValidSolanaAddress } from "@/lib/solana";
import { decryptMnemonic, getKeypairFromMnemonic } from "@/lib/crypto";
import { prepareMPCSigningKeypair } from "@/lib/mpc";
import { getTokenDetails, createTokenTransferTransaction, parseTokenAmount } from "@/lib/token";
import { isRelayerInitialized, createUserSplTokenTransaction, sendGaslessSplTokenTransaction } from "@/lib/relayer";
import bs58 from "bs58";

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
    const { to, amount, tokenMint, passcode, useRelayer, backupShare, recoveryShare } = await req.json();

    if (!to || !amount || !tokenMint) {
      return NextResponse.json(
        { error: "Missing required fields: to, amount, tokenMint" },
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

    // Get token details to parse the amount correctly
    const tokenDetails = await getTokenDetails(tokenMint);

    // Parse the token amount based on decimals
    const tokenAmount = parseTokenAmount(amount, tokenDetails.decimals);

    if (isNaN(tokenAmount) || tokenAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Create a record of the transaction request
    const transaction = await prisma.transaction.create({
      data: {
        txData: JSON.stringify({ to, amount, tokenMint }),
        status: "pending",
        user: {
          connect: { id: user.id }
        }
      },
    });

    // Handle transaction based on whether to use the relayer or not
    try {
      let signature;

      if (useRelayer && isRelayerInitialized()) {
        // Gasless transaction flow using relayer
        console.log("Using relayer for gasless transaction");

        // Create a transaction for the user to sign
        const unsignedTx = await createUserSplTokenTransaction(
          tokenMint,
          user.solanaAddress,
          to,
          tokenAmount
        );

        // Sign the transaction with the user's keypair
        unsignedTx.sign(keypair);

        // Serialize the signed transaction
        const serializedTx = bs58.encode(unsignedTx.serialize());

        // Send the transaction via the relayer
        const result = await sendGaslessSplTokenTransaction(
          tokenMint,
          user.solanaAddress,
          to,
          tokenAmount,
          serializedTx
        );

        signature = result.signature;
      } else {
        // Standard transaction flow where user pays gas
        console.log("Using standard transaction flow (user pays gas)");

        // Create token transfer transaction
        const tx = await createTokenTransferTransaction(
          keypair,
          tokenMint,
          to,
          tokenAmount
        );

        // Sign and send the transaction
        tx.sign(keypair);

        // Send the transaction
        const connection = await import("@/lib/solana").then(m => m.getSolanaConnection());
        signature = await connection.sendRawTransaction(tx.serialize());

        // Wait for confirmation
        await connection.confirmTransaction(signature);
      }

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
        message: "Token transaction sent successfully",
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
