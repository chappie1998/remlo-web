import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret });

  if (token && token.google_id_token) {
    return NextResponse.json({ idToken: token.google_id_token });
  } else {
    return NextResponse.json(
      { error: "ID token not found or session is invalid." },
      { status: 404 }
    );
  }
} 