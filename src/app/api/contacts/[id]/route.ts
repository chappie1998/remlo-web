import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET a single contact by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Get the user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to access contacts" },
        { status: 401 }
      );
    }

    // Get the user's ID
    const userResult = await prisma.$queryRaw`
      SELECT id FROM "User" WHERE email = ${session.user.email}
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

    // Fetch the contact, ensuring it belongs to the current user
    const contactResult = await prisma.$queryRaw`
      SELECT id, nickname, username, "solanaAddress", "isFavorite", "lastUsed", "createdAt"
      FROM "Contact"
      WHERE id = ${id} AND "userId" = ${userId}
    `;

    // @ts-ignore - safely ignore type errors because we're using raw queries
    if (!contactResult || contactResult.length === 0) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      // @ts-ignore - safely ignore type errors because we're using raw queries
      contact: contactResult[0] 
    });
  } catch (error) {
    console.error("Error fetching contact:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500 }
    );
  }
}

// PUT/PATCH to update a contact
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Get the user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to update contacts" },
        { status: 401 }
      );
    }

    // Parse the request body
    const { nickname, username, isFavorite } = await req.json();

    // Get the user's ID
    const userResult = await prisma.$queryRaw`
      SELECT id FROM "User" WHERE email = ${session.user.email}
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

    // Check if the contact exists and belongs to the user
    const existingContact = await prisma.$queryRaw`
      SELECT id FROM "Contact"
      WHERE id = ${id} AND "userId" = ${userId}
    `;

    // @ts-ignore - safely ignore type errors because we're using raw queries
    if (!existingContact || existingContact.length === 0) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Update the contact with individual fields to avoid dynamic SQL building
    const now = new Date().toISOString();
    
    if (nickname !== undefined && username !== undefined && isFavorite !== undefined) {
      await prisma.$executeRaw`
        UPDATE "Contact"
        SET nickname = ${nickname}, 
            username = ${username || null}, 
            "isFavorite" = ${isFavorite}, 
            "lastUsed" = ${now}
        WHERE id = ${id} AND "userId" = ${userId}
      `;
    } else if (nickname !== undefined && username !== undefined) {
      await prisma.$executeRaw`
        UPDATE "Contact"
        SET nickname = ${nickname}, 
            username = ${username || null}, 
            "lastUsed" = ${now}
        WHERE id = ${id} AND "userId" = ${userId}
      `;
    } else if (nickname !== undefined && isFavorite !== undefined) {
      await prisma.$executeRaw`
        UPDATE "Contact"
        SET nickname = ${nickname}, 
            "isFavorite" = ${isFavorite}, 
            "lastUsed" = ${now}
        WHERE id = ${id} AND "userId" = ${userId}
      `;
    } else if (username !== undefined && isFavorite !== undefined) {
      await prisma.$executeRaw`
        UPDATE "Contact"
        SET username = ${username || null}, 
            "isFavorite" = ${isFavorite}, 
            "lastUsed" = ${now}
        WHERE id = ${id} AND "userId" = ${userId}
      `;
    } else if (nickname !== undefined) {
      await prisma.$executeRaw`
        UPDATE "Contact"
        SET nickname = ${nickname}, 
            "lastUsed" = ${now}
        WHERE id = ${id} AND "userId" = ${userId}
      `;
    } else if (username !== undefined) {
      await prisma.$executeRaw`
        UPDATE "Contact"
        SET username = ${username || null}, 
            "lastUsed" = ${now}
        WHERE id = ${id} AND "userId" = ${userId}
      `;
    } else if (isFavorite !== undefined) {
      await prisma.$executeRaw`
        UPDATE "Contact"
        SET "isFavorite" = ${isFavorite}, 
            "lastUsed" = ${now}
        WHERE id = ${id} AND "userId" = ${userId}
      `;
    } else {
      // Only update lastUsed
      await prisma.$executeRaw`
        UPDATE "Contact"
        SET "lastUsed" = ${now}
        WHERE id = ${id} AND "userId" = ${userId}
      `;
    }

    // Fetch the updated contact
    const updatedContact = await prisma.$queryRaw`
      SELECT id, nickname, username, "solanaAddress", "isFavorite", "lastUsed", "createdAt"
      FROM "Contact"
      WHERE id = ${id}
    `;

    return NextResponse.json({ 
      // @ts-ignore - safely ignore type errors because we're using raw queries
      contact: updatedContact[0] 
    });
  } catch (error) {
    console.error("Error updating contact:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

// DELETE a contact
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Get the user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to delete contacts" },
        { status: 401 }
      );
    }

    // Get the user's ID
    const userResult = await prisma.$queryRaw`
      SELECT id FROM "User" WHERE email = ${session.user.email}
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

    // Check if the contact exists and belongs to the user
    const existingContact = await prisma.$queryRaw`
      SELECT id FROM "Contact"
      WHERE id = ${id} AND "userId" = ${userId}
    `;

    // @ts-ignore - safely ignore type errors because we're using raw queries
    if (!existingContact || existingContact.length === 0) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Delete the contact
    await prisma.$executeRaw`
      DELETE FROM "Contact"
      WHERE id = ${id} AND "userId" = ${userId}
    `;

    return NextResponse.json(
      { success: true, message: "Contact deleted successfully" }
    );
  } catch (error) {
    console.error("Error deleting contact:", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
} 