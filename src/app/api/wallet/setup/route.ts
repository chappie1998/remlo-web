import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { isValidPasscode, generateRandomUsername } from "@/lib/utils";
import { validateMnemonic } from "@/lib/crypto";
import { createMPCWallet } from "@/lib/mpc";
import { authOptions } from "@/lib/auth";
import { signJWT } from "@/lib/jwt";

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
    console.log('Handling wallet setup request');

    // Log all headers
    console.log('Request headers:');
    for (const [key, value] of req.headers.entries()) {
      console.log(`${key}: ${value}`);
    }

    // First, try to get the session from NextAuth
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      userEmail = session.user.email;
      console.log('Found user email from NextAuth session:', userEmail);
    }

    // If no NextAuth session, try to get the user from the Authorization header
    if (!userEmail) {
      const authHeader = req.headers.get('authorization');
      console.log('Authorization header:', authHeader);

      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        console.log('Extracted token:', token);

        // Find the session in the database
        const dbSession = await prisma.session.findUnique({
          where: { sessionToken: token },
          include: { user: true }
        });

        console.log('Database session lookup result:', dbSession ? 'Found' : 'Not found');

        if (dbSession?.user?.email && dbSession.expires > new Date()) {
          userEmail = dbSession.user.email;
          console.log('Found user email from session token:', userEmail);
        } else {
          console.log('Invalid or expired session token');
          if (dbSession) {
            console.log('Session expiry:', dbSession.expires);
            console.log('Current time:', new Date());
          }
        }
      }
    }

    if (!userEmail) {
      console.log('No valid user session found, returning 401');
      return NextResponse.json(
        { error: "You must be signed in to set up a wallet" },
        {
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Get the passcode and mnemonic from the request
    const { passcode, mnemonic } = await req.json();

    if (!isValidPasscode(passcode)) {
      return NextResponse.json(
        { error: "Passcode must be 6 digits" },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Validate that the mnemonic is a valid BIP-39 phrase (if provided)
    if (mnemonic && !validateMnemonic(mnemonic)) {
      return NextResponse.json(
        { error: "Invalid recovery phrase" },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    }

    // Create a new MPC wallet with 3-part secret sharing
    const { publicKey, serverShare, backupShare, recoveryShare, salt } = createMPCWallet(passcode);

    // Generate a random username
    let username = generateRandomUsername();
    let isUsernameTaken = true;
    let attempts = 0;
    
    // Make sure the username is unique (try up to 5 times)
    while (isUsernameTaken && attempts < 5) {
      attempts++;
      try {
        // Check if username exists
        const existingUser = await prisma.user.findUnique({
          where: { username }
        });
        
        if (!existingUser) {
          isUsernameTaken = false;
        } else {
          // Generate a new username if the current one is taken
          username = generateRandomUsername();
        }
      } catch (error) {
        console.error("Error checking username:", error);
        break; // Exit the loop on error
      }
    }

    // Update the user record with the wallet address, MPC information, and username
    const updatedUser = await prisma.user.update({
      where: { email: userEmail },
      data: {
        solanaAddress: publicKey,
        mpcServerShare: serverShare,
        mpcSalt: salt,
        mpcBackupShare: backupShare, // In production, this would be stored more securely or given to user
        usesMPC: true,
        hasPasscode: true,
        passcodeSetAt: new Date(),
        username, // Set the generated username
      },
      select: {
        id: true,
        email: true,
        solanaAddress: true,
        hasPasscode: true,
        username: true,
      },
    });

    // Create a new JWT token with the updated user information
    const jwtToken = signJWT({
      userId: updatedUser.id,
      email: updatedUser.email,
      solanaAddress: updatedUser.solanaAddress,
      hasPasscode: updatedUser.hasPasscode,
      username: updatedUser.username,
    });

    const response = NextResponse.json(
      {
        success: true,
        solanaAddress: publicKey,
        // Include both backup shares in the response for the user to save securely
        backupShare,
        recoveryShare, // Additional share for more recovery options
        username, // Include the username in the response
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

    // Set the JWT token as a secure HTTP-only cookie
    response.cookies.set('auth-token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error("Error setting up wallet:", error);
    return NextResponse.json(
      { error: "Failed to set up wallet" },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
        }
      }
    );
  }
}
