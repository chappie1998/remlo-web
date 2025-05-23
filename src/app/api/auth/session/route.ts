import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from '@/lib/jwt';

// Shared CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('⚡ Checking JWT/NextAuth session...');
    const user = await getUserFromRequest(req);
    
    if (!user) {
      console.log(`⚡ No valid session found (${Date.now() - startTime}ms)`);
      return NextResponse.json({ user: null }, { status: 200 });
    }

    console.log(`⚡ Session validated in ${Date.now() - startTime}ms`);
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        solanaAddress: user.solanaAddress,
        hasPasscode: user.hasPasscode,
        username: user.username,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Session validation error:', error);
    console.log(`❌ Session error in ${Date.now() - startTime}ms`);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
