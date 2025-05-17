import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

// Simple admin token check (in a real app, use proper authentication)
const validateAdminToken = (request: Request) => {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  // This is just a basic check - in production use proper auth
  return token === process.env.ADMIN_API_TOKEN;
};

// Function to get waitlist data from JSON file (fallback method)
async function getFromJsonFile() {
  try {
    const filePath = path.join(process.cwd(), 'waitlist.json');
    const fileData = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileData).emails || [];
  } catch (error) {
    return [];
  }
}

export async function GET(request: Request) {
  // Basic admin authentication
  if (!validateAdminToken(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    let entries = [];
    let source = 'unknown';

    // Try to get entries from database first
    try {
      // Check if the Waitlist table exists
      await prisma.$queryRaw`SELECT 1 FROM Waitlist LIMIT 1`;
      
      // If we get here, the table exists
      const dbEntries = await prisma.$queryRaw`SELECT * FROM Waitlist ORDER BY createdAt DESC`;
      if (Array.isArray(dbEntries) && dbEntries.length > 0) {
        entries = dbEntries;
        source = 'database';
      }
    } catch (tableError) {
      console.log('Waitlist table does not exist, falling back to JSON file');
      // Fall back to JSON file if database table doesn't exist
      entries = await getFromJsonFile();
      source = 'json';
    }

    return NextResponse.json({
      source,
      count: entries.length,
      entries
    });
  } catch (error) {
    console.error('Error retrieving waitlist:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve waitlist data' },
      { status: 500 }
    );
  }
} 