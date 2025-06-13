import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import prisma from '@/lib/prisma';
import { signJWT, createJWTCookie } from '@/lib/jwt';

const googleClient = new OAuth2Client(
  process.env.GOOGLE_ID!,
  process.env.GOOGLE_SECRET!,
  `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
);

// GET: Redirect to Google OAuth
export async function GET() {
  const authUrl = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'consent',
  });

  return NextResponse.redirect(authUrl);
}

// Handle Google OAuth callback
export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    
    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // Get user info from Google
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return NextResponse.json(
        { error: 'Failed to get user email from Google' },
        { status: 400 }
      );
    }

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { email: payload.email },
      select: {
        id: true,
        email: true,
        solanaAddress: true,
        hasPasscode: true,
        username: true,
      },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name || '',
          image: payload.picture || '',
        },
        select: {
          id: true,
          email: true,
          solanaAddress: true,
          hasPasscode: true,
          username: true,
        },
      });
    }

    // Create JWT token
    const jwtToken = signJWT({
      userId: user.id,
      email: user.email,
      solanaAddress: user.solanaAddress,
      hasPasscode: user.hasPasscode || false,
      username: user.username,
    });

    // Set cookie and return success
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          solanaAddress: user.solanaAddress,
          hasPasscode: user.hasPasscode,
          username: user.username,
        },
      },
      { status: 200 }
    );

    response.headers.set('Set-Cookie', createJWTCookie(jwtToken));
    return response;

  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
} 