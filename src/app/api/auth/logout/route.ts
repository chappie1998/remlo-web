import { NextResponse } from 'next/server';
import { createLogoutCookie } from '@/lib/jwt';

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200 }
  );

  // Clear the JWT cookie
  response.headers.set('Set-Cookie', createLogoutCookie());
  
  return response;
} 