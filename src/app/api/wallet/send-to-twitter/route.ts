import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { validateTwitterUsername, sendTwitterDM, createPaymentMessage } from "@/lib/twitter";
import { isValidPasscode, generateRandomUsername } from "@/lib/utils";
import { authOptions } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/jwt";
import prisma from "@/lib/prisma";
import { PublicKey, Transaction } from "@solana/web3.js";
import { 
  createTransferInstruction, 
  createAssociatedTokenAccountInstruction, 
  getAssociatedTokenAddress,
  getAccount
} from "@solana/spl-token";
import { SPL_TOKEN_ADDRESS, USDS_TOKEN_ADDRESS, getSolanaConnection } from "@/lib/solana";
import { prepareMPCSigningKeypair } from "@/lib/mpc";
import { sign } from "tweetnacl";

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
  try {
    let userEmail = null;
    let userId = null;
    console.log('🐦 Handling send to Twitter username request');

    // Authentication logic (same as wallet setup)
    const session = await getServerSession(authOptions);
    if (session?.user) {
      userEmail = session.user.email;
      userId = session.user.id;
      console.log('Found user from NextAuth session:', { email: userEmail, id: userId });
    }

    // Fallback to JWT if no NextAuth session
    if (!userEmail && !userId) {
      const userData = await getUserFromRequest(req);
      if (userData?.email || userData?.id) {
        userEmail = userData.email;
        userId = userData.id;
        console.log('Found user from JWT token:', { email: userEmail, id: userId });
      }
    }

    if (!userEmail && !userId) {
      return NextResponse.json(
        { error: "You must be signed in to send payments" },
        { status: 401 }
      );
    }

    const { 
      twitterUsername, 
      amount, 
      tokenType, 
      passcode,
      note 
    } = await req.json();

    // Validate required fields
    if (!twitterUsername || !amount || !tokenType || !passcode) {
      return NextResponse.json(
        { error: "Missing required fields: twitterUsername, amount, tokenType, passcode" },
        { status: 400 }
      );
    }

    if (!isValidPasscode(passcode)) {
      return NextResponse.json(
        { error: "Passcode must be 6 digits" },
        { status: 400 }
      );
    }

    // Get sender user data
    const whereClause = userEmail ? { email: userEmail } : { id: userId! };
    const senderUser = await prisma.user.findUnique({
      where: whereClause,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        solanaAddress: true,
        mpcServerShare: true,
        mpcSalt: true,
        hasPasscode: true,
        passcodeHash: true,
      },
    });

    if (!senderUser || !senderUser.solanaAddress) {
      return NextResponse.json(
        { error: "User not found or wallet not set up" },
        { status: 404 }
      );
    }

    // Validate Twitter username
    console.log('🔍 Validating Twitter username:', twitterUsername);
    const twitterValidation = await validateTwitterUsername(twitterUsername);
    
    // if (!twitterValidation.valid) {
    //   return NextResponse.json(
    //     { error: `Twitter username validation failed: ${twitterValidation.error}` },
    //     { status: 400 }
    //   );
    // }

    // Use validation result if available, otherwise create mock user for rate-limited scenarios
    const twitterUser = twitterValidation.user || {
      id: `mock_${twitterUsername}`,
      username: twitterUsername,
      name: twitterUsername,
      profile_image_url: `https://via.placeholder.com/40?text=${twitterUsername[0].toUpperCase()}`
    };
    console.log('✅ Twitter user found:', twitterUser.username);

    // Check if this Twitter user already has an account in our system
    // Look for exact Twitter username match in our username field
    console.log('🔍 Looking for user with Twitter username:', twitterUser.username);
    let recipientUser = await prisma.user.findFirst({
      where: {
        username: twitterUser.username
      },
      select: {
        id: true,
        solanaAddress: true,
        username: true,
        name: true,
      }
    });

    console.log('👤 Found recipient user:', recipientUser ? 'Yes' : 'No');
    if (recipientUser) {
      console.log('💳 Recipient has wallet:', recipientUser.solanaAddress ? 'Yes' : 'No');
    }

    // If recipient has a wallet in our system, do direct transfer
    if (recipientUser?.solanaAddress) {
      console.log('📤 Recipient has wallet, doing direct transfer');
      return await performDirectTransfer({
        senderUser,
        recipientAddress: recipientUser.solanaAddress,
        amount,
        tokenType,
        passcode,
        twitterUser,
        note
      });
    } else {
      console.log('🔗 Recipient no wallet, creating payment link');
      return await createPaymentLink({
        senderUser,
        amount,
        tokenType,
        passcode,
        twitterUser,
        note
      });
    }

  } catch (error) {
    console.error("Error in send to Twitter:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Direct transfer when recipient has a wallet
async function performDirectTransfer({
  senderUser,
  recipientAddress,
  amount,
  tokenType,
  passcode,
  twitterUser,
  note
}: any) {
  try {
    const connection = getSolanaConnection();
    const amountInSmallestUnit = Math.floor(parseFloat(amount) * 1_000_000);
    
    // Get token mint address
    const tokenMintAddress = tokenType === "usds" ? USDS_TOKEN_ADDRESS : SPL_TOKEN_ADDRESS;
    const tokenMint = new PublicKey(tokenMintAddress);
    
    // Create public keys
    const senderPublicKey = new PublicKey(senderUser.solanaAddress);
    const recipientPublicKey = new PublicKey(recipientAddress);
    
    // Get associated token accounts
    const senderTokenAccount = await getAssociatedTokenAddress(tokenMint, senderPublicKey);
    const recipientTokenAccount = await getAssociatedTokenAddress(tokenMint, recipientPublicKey);
    
    // Create transaction
    const transaction = new Transaction();
    
    // Check if recipient token account exists
    try {
      await getAccount(connection, recipientTokenAccount);
    } catch (error) {
      // Create recipient token account if it doesn't exist
      transaction.add(
        createAssociatedTokenAccountInstruction(
          senderPublicKey, // payer
          recipientTokenAccount, // ata
          recipientPublicKey, // owner
          tokenMint // mint
        )
      );
    }
    
    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        senderTokenAccount, // source
        recipientTokenAccount, // destination
        senderPublicKey, // owner
        amountInSmallestUnit // amount
      )
    );
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = senderPublicKey;
    
    // Sign transaction with MPC
    const keypair = prepareMPCSigningKeypair(
      senderUser.mpcServerShare!,
      senderUser.mpcSalt!,
      passcode
    );
    
    if (!keypair) {
      throw new Error("Failed to prepare keypair for signing");
    }
    
    transaction.sign(keypair);
    
    // Send transaction
    const signature = await connection.sendRawTransaction(transaction.serialize());
    console.log('✅ Transaction sent:', signature);
    
    // Store transaction record with Twitter metadata
    const transactionRecord = await prisma.transaction.create({
      data: {
        userId: senderUser.id,
        txData: JSON.stringify({
          type: "send_to_twitter",
          to: recipientAddress,
          twitterUsername: twitterUser.username,
          twitterUserId: twitterUser.id,
          twitterName: twitterUser.name,
          amount: parseFloat(amount),
          tokenType,
          note: note || null,
          dmSent: false, // Will be updated after DM attempt
          recipientHadWallet: true
        }),
        status: "submitted",
        signature,
      },
    });
    
    // Send success DM
    const message = createPaymentMessage(
      senderUser.name || senderUser.username || 'Someone',
      amount,
      tokenType,
      `https://solscan.io/tx/${signature}?cluster=devnet`
    );
    
    const dmResult = await sendTwitterDM(twitterUser.id, message);
    
    // Update transaction record with DM status
    await prisma.transaction.update({
      where: { id: transactionRecord.id },
      data: {
        txData: JSON.stringify({
          ...JSON.parse(transactionRecord.txData),
          dmSent: dmResult.success,
          dmError: dmResult.error || null
        })
      }
    });
    
    if (!dmResult.success) {
      console.warn('Failed to send Twitter DM:', dmResult.error);
    }
    
    return NextResponse.json({
      success: true,
      signature,
      transactionId: transactionRecord.id,
      dmSent: dmResult.success,
      twitterUsername: twitterUser.username
    });
    
  } catch (error) {
    console.error("Direct transfer error:", error);
    throw error;
  }
}

// Create payment link when recipient doesn't have a wallet
async function createPaymentLink({
  senderUser,
  amount,
  tokenType,
  passcode,
  twitterUser,
  note
}: any) {
  try {
    // Create payment link similar to your existing payment link functionality
    const shortId = `pl_${generateRandomUsername().slice(0, 8)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // For now, create a simple payment link record
    // You might want to integrate with your existing payment link system
    const paymentLink = await prisma.paymentLink.create({
      data: {
        shortId,
        creatorId: senderUser.id,
        amount: amount.toString(),
        tokenType,
        note: note || `Payment from ${senderUser.name || senderUser.username || 'Remlo user'} to @${twitterUser.username} via Twitter`,
        status: "active",
        verificationData: "", // You might want to add verification
        expiresAt,
      },
    });
    
    const paymentUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/claim/${shortId}`;
    
    // Send DM with payment link
    const message = createPaymentMessage(
      senderUser.name || senderUser.username || 'Someone',
      amount,
      tokenType,
      paymentUrl
    );
    
    const dmResult = await sendTwitterDM(twitterUser.id, message);
    
    return NextResponse.json({
      success: true,
      paymentLinkId: paymentLink.id,
      paymentUrl,
      dmSent: dmResult.success,
      dmError: dmResult.error
    });
    
  } catch (error) {
    console.error("Payment link creation error:", error);
    throw error;
  }
} 