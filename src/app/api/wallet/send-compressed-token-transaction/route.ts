import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { PublicKey, Transaction, ComputeBudgetProgram } from "@solana/web3.js";
import { isValidPasscode } from "@/lib/utils";
import { createCompressedTokenTransferInstruction, USDC_MINT, VAULT, C_SOLANA_RPC_URL, isValidSolanaAddress } from "@/lib/solana";
import { decryptMnemonic, getKeypairFromMnemonic } from "@/lib/crypto";
import { prepareMPCSigningKeypair } from "@/lib/mpc";
import { authOptions } from "@/lib/auth";
import { createRpc } from "@lightprotocol/stateless.js";

const prisma = new PrismaClient();

// Handle OPTIONS request for CORS preflight
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
  // let dbTransactionRecordId: string | null = null; // Commenting out Prisma logging for now
  try {
    let userEmail = null;
    const session = await getServerSession(authOptions);
    if (session?.user?.email) userEmail = session.user.email;
    if (!userEmail) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const dbSession = await prisma.session.findUnique({
          where: { sessionToken: token },
          include: { user: true }
        });
        if (dbSession?.user?.email && dbSession.expires > new Date()) {
          userEmail = dbSession.user.email;
        }
      }
    }
    if (!userEmail) {
      return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
    }

    const { to, amount, passcode, backupShare, recoveryShare } = await req.json();

    if (!to || !amount || !isValidPasscode(passcode) || !isValidSolanaAddress(to)) {
        return NextResponse.json({ error: "Invalid input: to, amount, passcode, or recipient address is invalid." }, { status: 400 }); 
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, encryptedKeypair: true, solanaAddress: true, usesMPC: true, mpcServerShare: true, mpcSalt: true, mpcBackupShare: true },
    });

    if (!user || !user.solanaAddress) {
      return NextResponse.json({ error: "Wallet not set up" }, { status: 400 });
    }
    
    const numericAmount = Number(amount);
    /* // Commenting out Prisma logging
    const dbTx = await prisma.transaction.create({
        data: { // This data structure needs to match your Prisma schema
          userId: user.id,
          status: "PENDING", 
          amount: numericAmount,
          recipientAddress: to,
          tokenMint: USDC_MINT.toBase58(),
          txData: JSON.stringify({ type: 'SEND_COMPRESSED', from: user.solanaAddress, to: to, amount: numericAmount, token: 'USDS' })
        }
      });
    dbTransactionRecordId = dbTx.id;
    */

    let userKeypair;
    if (user.usesMPC) {
      if (!user.mpcServerShare || !user.mpcSalt) {
        // if (dbTransactionRecordId) await prisma.transaction.update({ where: { id: dbTransactionRecordId }, data: { status: "FAILED" } });
        return NextResponse.json({ error: "MPC Wallet not set up properly" }, { status: 400 });
      }
      const clientBackupShare = backupShare || user.mpcBackupShare;
      userKeypair = prepareMPCSigningKeypair(passcode, user.mpcServerShare, user.mpcSalt, clientBackupShare, recoveryShare);
      if (!userKeypair || userKeypair.publicKey.toBase58() !== user.solanaAddress) {
        // if (dbTransactionRecordId) await prisma.transaction.update({ where: { id: dbTransactionRecordId }, data: { status: "FAILED" } });
        return NextResponse.json({ error: "Invalid passcode or shares, or address mismatch" }, { status: 401 });
      }
    } else {
       if (!user.encryptedKeypair) {
        // if (dbTransactionRecordId) await prisma.transaction.update({ where: { id: dbTransactionRecordId }, data: { status: "FAILED" } });
         return NextResponse.json({ error: "Legacy wallet not set up properly" }, { status: 400 });
       }
       const mnemonic = await decryptMnemonic(user.encryptedKeypair, passcode);
       if (!mnemonic) {
        // if (dbTransactionRecordId) await prisma.transaction.update({ where: { id: dbTransactionRecordId }, data: { status: "FAILED" } });
         return NextResponse.json({ error: "Invalid passcode for legacy wallet" }, { status: 401 });
       }
       userKeypair = getKeypairFromMnemonic(mnemonic);
        if (userKeypair.publicKey.toBase58() !== user.solanaAddress) {
            // if (dbTransactionRecordId) await prisma.transaction.update({ where: { id: dbTransactionRecordId }, data: { status: "FAILED" } });
            return NextResponse.json({ error: "Legacy wallet address mismatch" }, { status: 401 });
        }
    }
    if (!userKeypair) {
        // if (dbTransactionRecordId) await prisma.transaction.update({ where: { id: dbTransactionRecordId }, data: { status: "FAILED" } });
        return NextResponse.json({ error: "Failed to derive keypair" }, { status: 500 });
    }
    if (numericAmount <= 0 || Number.isNaN(numericAmount)) { // Added check for valid numeric amount
      // if (dbTransactionRecordId) await prisma.transaction.update({ where: { id: dbTransactionRecordId }, data: { status: "FAILED" /*, failureReason: "Invalid amount" */ } });
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const lightConnection = createRpc(C_SOLANA_RPC_URL, C_SOLANA_RPC_URL, C_SOLANA_RPC_URL);
    const recipientPublicKey = new PublicKey(to);

    const transferInstruction = await createCompressedTokenTransferInstruction(
      lightConnection,
      userKeypair.publicKey,
      recipientPublicKey,
      numericAmount
    );

    const transaction = new Transaction();
    transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
    transaction.add(transferInstruction);
    transaction.feePayer = VAULT.publicKey;
    const { blockhash } = await lightConnection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.sign(VAULT, userKeypair);
    const serializedTransaction = transaction.serialize();
    const signature = await lightConnection.sendRawTransaction(serializedTransaction, { skipPreflight: true });
    console.log("Transaction sent with signature:", signature);
    await lightConnection.confirmTransaction(signature, 'confirmed');
    console.log("Transaction confirmed:", signature);

    /* // Commenting out Prisma logging
    if (dbTransactionRecordId) {
        await prisma.transaction.update({
        where: { id: dbTransactionRecordId },
        data: { status: "EXECUTED", signature: signature, executedAt: new Date() },
        });
    }
    */

    return NextResponse.json({ success: true, signature });

  } catch (error) {
    console.error("Error in send-compressed-token-transaction API:", error);
    const errorMessage = error instanceof Error ? error.message : "Transaction failed";
    /* // Commenting out Prisma logging
    if (dbTransactionRecordId) {
        await prisma.transaction.update({
            where: { id: dbTransactionRecordId },
            data: { status: "FAILED" }, // Add failureReason if schema supports it
        });
    }
    */
    return NextResponse.json({ error: errorMessage, details: JSON.stringify(error, Object.getOwnPropertyNames(error)) }, { status: 500 });
  }
}
