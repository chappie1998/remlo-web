import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Simple in-memory cache for user lookups
interface CacheEntry {
  data: { found: boolean; username?: string; solanaAddress?: string; message?: string };
  timestamp: number;
}

const userCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL

// Helper function to clean expired cache entries
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of userCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      userCache.delete(key);
    }
  }
}

// Helper function to get from cache
function getFromCache(username: string): CacheEntry | null {
  const entry = userCache.get(username.toLowerCase());
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL) {
    userCache.delete(username.toLowerCase());
    return null;
  }
  
  return entry;
}

// Helper function to set cache
function setCache(username: string, data: any) {
  // Clean expired entries occasionally
  if (userCache.size > 100) {
    cleanExpiredCache();
  }
  
  userCache.set(username.toLowerCase(), {
    data,
    timestamp: Date.now()
  });
}

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
    // Get the username from request body
    const { username } = await req.json();
    
    // Input validation
    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { error: "Username is required and must be a string" },
        { status: 400 }
      );
    }

    // Sanitize username - trim whitespace and normalize case
    const cleanUsername = username.trim();
    
    if (cleanUsername.length < 2) {
      return NextResponse.json(
        { error: "Username must be at least 2 characters long" },
        { status: 400 }
      );
    }

    if (cleanUsername.length > 50) {
      return NextResponse.json(
        { error: "Username must be 50 characters or less" },
        { status: 400 }
      );
    }

    // Basic username format validation (alphanumeric + underscore only)
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = getFromCache(cleanUsername);
    if (cached) {
      return NextResponse.json(cached.data);
    }

    // Use Prisma's optimized query with select to only fetch needed fields
    const user = await prisma.user.findUnique({
      where: {
        username: cleanUsername
      },
      select: {
        id: true,
        username: true,
        solanaAddress: true,
        baseAddress: true, // Include Base address for cross-chain transfers
        hasPasscode: true // Include to verify user has completed setup
      }
    });

    let response;
    
    // Check if user exists and has completed wallet setup
    if (!user || !user.solanaAddress || !user.hasPasscode) {
      response = {
        found: false,
        message: "User not found or wallet not set up"
      };
    } else {
      response = {
        found: true,
        username: user.username,
        solanaAddress: user.solanaAddress,
        baseAddress: user.baseAddress,
      };
    }

    // Cache the result
    setCache(cleanUsername, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error("Error looking up user:", error);
    return NextResponse.json(
      { error: "An error occurred while looking up the user" },
      { status: 500 }
    );
  }
} 