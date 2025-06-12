import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from "@prisma/client";
import { signJWT } from "@/lib/jwt";

const prisma = new PrismaClient();

// Initialize Google OAuth2 client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_ID, // Your Google Client ID
  process.env.GOOGLE_SECRET,
  'postmessage' // For mobile apps
);

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
    const { idToken, serverAuthCode } = await req.json();

    console.log('Google sign-in request received:', {
      hasIdToken: !!idToken,
      hasServerAuthCode: !!serverAuthCode,
      idTokenLength: idToken?.length,
      googleClientId: process.env.GOOGLE_ID?.substring(0, 20) + '...'
    });

    if (!idToken) {
      return NextResponse.json(
        { error: "Google ID token is required" },
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

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_ID,
    });

    const payload = ticket.getPayload();
    
    if (!payload || !payload.email) {
      return NextResponse.json(
        { error: "Invalid Google token" },
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

    console.log('Google authentication payload:', {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      email_verified: payload.email_verified
    });

    // Check if email is verified
    if (!payload.email_verified) {
      return NextResponse.json(
        { error: "Email not verified with Google" },
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

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { email: payload.email },
      select: {
        id: true,
        email: true,
        name: true,
        solanaAddress: true,
        hasPasscode: true,
        username: true,
        image: true,
      },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          image: payload.picture,
          emailVerified: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          solanaAddress: true,
          hasPasscode: true,
          username: true,
          image: true,
        },
      });

      console.log('Created new user:', user.id);
    } else {
      // Update existing user with latest Google info
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: payload.name || user.name,
          image: payload.picture || user.image,
          emailVerified: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          solanaAddress: true,
          hasPasscode: true,
          username: true,
          image: true,
        },
      });

      console.log('Updated existing user:', user.id);
    }

    // Generate JWT token for mobile app
    const sessionToken = signJWT({
      userId: user.id,
      email: user.email!,
      solanaAddress: user.solanaAddress,
      evmAddress: null, // Will be set when cross-chain wallet is created
      hasPasscode: user.hasPasscode || false,
      username: user.username,
    });

    return NextResponse.json({
      success: true,
      sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        solanaAddress: user.solanaAddress,
        hasPasscode: user.hasPasscode || false,
        username: user.username,
        image: user.image,
      },
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      }
    });

  } catch (error) {
    console.error("Google sign-in error:", error);
    
    if (error instanceof Error && error.message.includes('Token used too late')) {
      return NextResponse.json(
        { error: "Google token has expired. Please try signing in again." },
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

    return NextResponse.json(
      { error: "Failed to authenticate with Google" },
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
  } finally {
    await prisma.$disconnect();
  }
} 