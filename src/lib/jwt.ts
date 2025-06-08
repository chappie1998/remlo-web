import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { getToken } from "next-auth/jwt";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '30d'; // 30 days

export interface JWTPayload {
  userId: string;
  email: string | null;
  solanaAddress: string | null;
  hasPasscode: boolean;
  username: string | null;
  iat?: number;
  exp?: number;
}

export interface UserData {
  id: string;
  email: string | null;
  solanaAddress: string | null;
  hasPasscode: boolean;
  username: string | null;
}

// Sign JWT token
export function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256'
  });
}

// Verify JWT token
export function verifyJWT(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256']
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// Extract JWT from request (cookie or Authorization header)
export function extractJWT(req: NextRequest): string | null {
  // Try cookie first
  const cookieToken = req.cookies.get('auth-token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // Try Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

// Backward compatibility: Check NextAuth token
async function getUserFromNextAuthToken(req: NextRequest): Promise<UserData | null> {
  try {
    const token = await getToken({ 
      req: req as any, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token?.email || !token?.userId) {
      return null;
    }

    // If solanaAddress is missing from token, check database (wallet might have been set up after login)
    if (!token.solanaAddress) {
      console.log('⚠️  NextAuth token missing solanaAddress, checking database...');
      const prisma = (await import('@/lib/prisma')).default;
      
      const userData = await prisma.user.findUnique({
        where: { id: token.userId as string },
        select: {
          id: true,
          email: true,
          solanaAddress: true,
          hasPasscode: true,
          username: true,
        },
      });

      if (userData) {
        console.log(`🔄 Found wallet in database: ${userData.solanaAddress ? 'Has wallet' : 'No wallet'}`);
        return {
          id: userData.id,
          email: userData.email || null,
          solanaAddress: userData.solanaAddress,
          hasPasscode: userData.hasPasscode || false,
          username: userData.username,
        };
      }
    }

    return {
      id: token.userId as string,
      email: token.email,
      solanaAddress: token.solanaAddress as string | null,
      hasPasscode: token.hasPasscode as boolean || false,
      username: token.username as string | null,
    };
  } catch (error) {
    console.log('NextAuth token lookup failed:', error);
    return null;
  }
}

// Get user from JWT token in request (with NextAuth fallback)
export async function getUserFromRequest(req: NextRequest): Promise<UserData | null> {
  // Try our JWT system first
  const token = extractJWT(req);
  if (token) {
    const payload = verifyJWT(token);
    if (payload) {
      return {
        id: payload.userId,
        email: payload.email,
        solanaAddress: payload.solanaAddress,
        hasPasscode: payload.hasPasscode,
        username: payload.username,
      };
    }
  }

  // Fallback to NextAuth for backward compatibility
  return await getUserFromNextAuthToken(req);
}

// Create JWT cookie string
export function createJWTCookie(token: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
  
  return `auth-token=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${isProduction ? '; Secure' : ''}`;
}

// Create logout cookie string
export function createLogoutCookie(): string {
  return 'auth-token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax';
} 