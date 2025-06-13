import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isValidSolanaAddress } from "@/lib/solana";
import { getUserFromRequest } from "@/lib/jwt";

// GET handler to fetch all contacts for the current user
export async function GET(req: NextRequest) {
  try {
    let userEmail = null;

    // First, try to get the session from NextAuth
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      userEmail = session.user.email;
    }

    // If no NextAuth session, try to get the user from JWT token (mobile app)
    if (!userEmail) {
      const userData = await getUserFromRequest(req);
      if (userData?.email) {
        userEmail = userData.email;
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: "You must be signed in to access contacts" },
        { status: 401 }
      );
    }

    // Get the user's ID first
    const userResult = await prisma.$queryRaw`
      SELECT id FROM "User" WHERE email = ${userEmail}
    `;

    // @ts-ignore - safely ignore type errors because we're using raw queries
    if (!userResult || userResult.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // @ts-ignore - safely ignore type errors because we're using raw queries
    const userId = userResult[0].id;

    // Fetch the user's contacts from the database using direct SQL
    const contacts = await prisma.$queryRaw`
      SELECT id, nickname, username, "solanaAddress", "isFavorite", "lastUsed", "createdAt"
      FROM "Contact"
      WHERE "userId" = ${userId}
      ORDER BY "isFavorite" DESC, "lastUsed" DESC
    `;

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

// POST handler to create a new contact
export async function POST(req: NextRequest) {
  try {
    let userEmail = null;

    // First, try to get the session from NextAuth
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      userEmail = session.user.email;
    }

    // If no NextAuth session, try to get the user from JWT token (mobile app)
    if (!userEmail) {
      const userData = await getUserFromRequest(req);
      if (userData?.email) {
        userEmail = userData.email;
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: "You must be signed in to create contacts" },
        { status: 401 }
      );
    }

    // Get the request body
    const { nickname, username, solanaAddress, isFavorite } = await req.json();

    // Validate the required fields
    if (!nickname || nickname.trim() === "") {
      return NextResponse.json(
        { error: "Nickname is required" },
        { status: 400 }
      );
    }

    if (!solanaAddress || !isValidSolanaAddress(solanaAddress)) {
      return NextResponse.json(
        { error: "Valid Solana address is required" },
        { status: 400 }
      );
    }

    // Get the user's ID
    const userResult = await prisma.$queryRaw`
      SELECT id FROM "User" WHERE email = ${userEmail}
    `;

    // @ts-ignore - safely ignore type errors because we're using raw queries
    if (!userResult || userResult.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // @ts-ignore - safely ignore type errors because we're using raw queries
    const userId = userResult[0].id;

    // Check if this contact already exists
    const existingContact = await prisma.$queryRaw`
      SELECT id FROM "Contact" 
      WHERE "userId" = ${userId} AND "solanaAddress" = ${solanaAddress}
    `;

    // @ts-ignore - safely ignore type errors because we're using raw queries
    if (existingContact && existingContact.length > 0) {
      return NextResponse.json(
        { error: "A contact with this address already exists" },
        { status: 400 }
      );
    }

    // Create the contact using direct SQL
    const now = new Date().toISOString();
    const favoriteValue = isFavorite || false;
    const contactId = crypto.randomUUID();
    
    await prisma.$executeRaw`
      INSERT INTO "Contact" (id, nickname, username, "solanaAddress", "isFavorite", "lastUsed", "createdAt", "userId")
      VALUES (${contactId}, ${nickname}, ${username || null}, ${solanaAddress}, ${favoriteValue}, ${now}, ${now}, ${userId})
    `;

    // Fetch the created contact to return
    const newContact = await prisma.$queryRaw`
      SELECT id, nickname, username, "solanaAddress", "isFavorite", "lastUsed", "createdAt"
      FROM "Contact"
      WHERE id = ${contactId}
    `;

    return NextResponse.json({ 
      // @ts-ignore - safely ignore type errors because we're using raw queries
      contact: newContact[0] 
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating contact:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
} 