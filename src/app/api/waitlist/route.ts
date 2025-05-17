import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

// Function to add email to waitlist.json file (fallback method)
async function addToJsonFile(email: string) {
  // Get the waitlist file path
  const filePath = path.join(process.cwd(), 'waitlist.json');
  
  // Read the existing waitlist data
  let waitlistData;
  try {
    const fileData = await fs.readFile(filePath, 'utf8');
    waitlistData = JSON.parse(fileData);
  } catch (error) {
    // If file doesn't exist or is not valid JSON, create a new structure
    waitlistData = { emails: [] };
  }
  
  // Check if email already exists
  const emailExists = waitlistData.emails.some(
    (entry: { email: string }) => entry.email.toLowerCase() === email.toLowerCase()
  );

  if (emailExists) {
    return { exists: true };
  }

  // Add the new email to the waitlist
  waitlistData.emails.push({
    email,
    timestamp: new Date().toISOString(),
  });

  // Write the updated data back to the file
  await fs.writeFile(filePath, JSON.stringify(waitlistData, null, 2), 'utf8');
  return { exists: false, added: true };
}

export async function POST(request: Request) {
  try {
    const { email, referrer } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Try to use Prisma first, fall back to JSON file if Prisma fails
    try {
      // Check if the Waitlist table exists by trying to query it
      try {
        await prisma.$queryRaw`SELECT 1 FROM Waitlist LIMIT 1`;
      } catch (tableError) {
        console.log('Waitlist table does not exist, falling back to JSON storage');
        const result = await addToJsonFile(email);
        
        if (result.exists) {
          return NextResponse.json(
            { message: 'You\'re already on our waitlist!' },
            { status: 200 }
          );
        }
        
        return NextResponse.json(
          { message: 'Thank you for joining our waitlist!' },
          { status: 201 }
        );
      }
      
      // If we get here, the table exists
      // Check if email already exists in the database
      const existingEntry = await prisma.$queryRaw`SELECT id FROM Waitlist WHERE email = ${email.toLowerCase()} LIMIT 1`;
      
      if (Array.isArray(existingEntry) && existingEntry.length > 0) {
        return NextResponse.json(
          { message: 'You\'re already on our waitlist!' },
          { status: 200 }
        );
      }

      // Add the new email to the waitlist database
      const now = new Date();
      await prisma.$executeRaw`
        INSERT INTO Waitlist (id, email, referrer, createdAt, updatedAt) 
        VALUES (${crypto.randomUUID()}, ${email.toLowerCase()}, ${referrer || null}, ${now.toISOString()}, ${now.toISOString()})
      `;
      
      return NextResponse.json(
        { message: 'Thank you for joining our waitlist!' },
        { status: 201 }
      );
    } catch (dbError) {
      console.log('Database error, falling back to JSON storage:', dbError);
      
      // Fall back to JSON file storage
      const result = await addToJsonFile(email);
      
      if (result.exists) {
        return NextResponse.json(
          { message: 'You\'re already on our waitlist!' },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        { message: 'Thank you for joining our waitlist!' },
        { status: 201 }
      );
    }
  } catch (error: any) {
    console.error('Error adding to waitlist:', error);
    return NextResponse.json(
      { message: 'Failed to add to waitlist' },
      { status: 500 }
    );
  }
} 