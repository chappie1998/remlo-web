import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { isValidPasscode, generateRandomUsername } from "@/lib/utils";
import { validateMnemonic } from "@/lib/crypto";
import { createMPCWallet } from "@/lib/mpc";
import { authOptions } from "@/lib/auth";
import { signJWT, getUserFromRequest } from "@/lib/jwt";

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
  try {
    let userEmail = null;
    console.log('Handling universal wallet setup request');

    // Get user authentication (similar to existing setup)
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      userEmail = session.user.email;
      console.log('Found user email from NextAuth session:', userEmail);
    }

    if (!userEmail) {
      const userData = await getUserFromRequest(req);
      if (userData?.email) {
        userEmail = userData.email;
        console.log('Found user email from JWT token:', userEmail);
      }
    }

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
          console.log('Found user email from session token:', userEmail);
        }
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: "You must be signed in to set up a wallet" },
        { status: 401 }
      );
    }

    // Get request parameters
    const { 
      passcode, 
      mnemonic, 
      oktoUserSWA, 
      oktoUserId 
    } = await req.json();

    // Validate passcode
    if (!isValidPasscode(passcode)) {
      return NextResponse.json(
        { error: "Passcode must be 6 digits" },
        { status: 400 }
      );
    }

    // Validate mnemonic if provided
    if (mnemonic && !validateMnemonic(mnemonic)) {
      return NextResponse.json(
        { error: "Invalid recovery phrase" },
        { status: 400 }
      );
    }

    // Create Solana MPC wallet
    const { publicKey, serverShare, backupShare, recoveryShare, salt } = createMPCWallet(passcode);
    console.log('Created Solana MPC wallet:', publicKey);

    // Generate unique username
    let username = generateRandomUsername();
    let isUsernameTaken = true;
    let attempts = 0;
    
    while (isUsernameTaken && attempts < 5) {
      attempts++;
      try {
        const existingUser = await prisma.user.findUnique({
          where: { username }
        });
        
        if (!existingUser) {
          isUsernameTaken = false;
        } else {
          username = generateRandomUsername();
        }
      } catch (error) {
        console.error("Error checking username:", error);
        break;
      }
    }

    // Update user with both Solana and Base wallet information
    const updateData: any = {
      // Solana MPC wallet data
      solanaAddress: publicKey,
      mpcServerShare: serverShare,
      mpcSalt: salt,
      mpcBackupShare: backupShare,
      usesMPC: true,
      hasPasscode: true,
      passcodeSetAt: new Date(),
      username,
    };

    // Add Base Okto wallet data if provided
    if (oktoUserSWA) {
      console.log('✅ Received Base wallet address from client:', oktoUserSWA);
      updateData.baseAddress = oktoUserSWA; // Same address for Base
      updateData.oktoUserSWA = oktoUserSWA;
      updateData.hasOktoWallet = true;
      updateData.oktoCreatedAt = new Date();
      if (oktoUserId) {
        updateData.oktoUserId = oktoUserId;
      }
      console.log('Updating user record with Base wallet info...');
    } else {
      console.log('⚠️ No Base wallet address (oktoUserSWA) provided in the request.');
    }

    const updatedUser = await prisma.user.update({
      where: { email: userEmail },
      data: updateData,
      select: {
        id: true,
        email: true,
        solanaAddress: true,
        baseAddress: true,
        hasPasscode: true,
        hasOktoWallet: true,
        username: true,
      },
    });

    // Create JWT token with updated user information
    const jwtToken = signJWT({
      userId: updatedUser.id,
      email: updatedUser.email,
      solanaAddress: updatedUser.solanaAddress,
      baseAddress: updatedUser.baseAddress,
      hasPasscode: updatedUser.hasPasscode,
      hasOktoWallet: updatedUser.hasOktoWallet,
      username: updatedUser.username,
    });

    const response = NextResponse.json(
      {
        success: true,
        solanaAddress: publicKey,
        baseAddress: updatedUser.baseAddress,
        backupShare,
        recoveryShare,
        username,
        hasOktoWallet: updatedUser.hasOktoWallet,
        message: "Universal wallet setup successful",
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );

    // Set JWT token as secure cookie
    response.cookies.set('auth-token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error("Error setting up universal wallet:", error);
    return NextResponse.json(
      { error: "Failed to set up wallet" },
      { status: 500 }
    );
  }
} 