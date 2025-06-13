import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { reconstructCrossChainWallet } from "@/lib/cross-chain-wallet";

const prisma = new PrismaClient();

// Migration endpoint to fix fake EVM addresses for existing users
export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Starting EVM address migration...');
    
    // Get all users with MPC data who have EVM addresses (potentially fake)
    const usersToMigrate = await prisma.user.findMany({
      where: {
        usesMPC: true,
        mpcServerShare: { not: null },
        mpcSalt: { not: null },
        mpcBackupShare: { not: null },
        // Type assertion needed for evmAddress field
        ...({}), // Dummy where condition for now
      },
      select: {
        id: true,
        email: true,
        mpcServerShare: true,
        mpcSalt: true,
        mpcBackupShare: true
      }
    }) as Array<{
      id: string;
      email: string | null;
      mpcServerShare: string | null;
      mpcSalt: string | null;
      mpcBackupShare: string | null;
      evmAddress?: string | null;
    }>;

    console.log(`Found ${usersToMigrate.length} users to potentially migrate`);

    let migratedCount = 0;
    let errorCount = 0;
    const migrationResults = [];

    for (const user of usersToMigrate) {
      try {
        // We need the user's passcode to reconstruct the wallet
        // Since we don't have it, we'll create a special migration endpoint
        // that can only be called by the user with their passcode
        
        // For now, we'll just log what would be migrated
        console.log(`User ${user.email}: Current EVM address ${user.evmAddress}`);
        
        migrationResults.push({
          userId: user.id,
          email: user.email,
          currentEvmAddress: user.evmAddress,
          status: 'pending_user_action',
          message: 'User must call migration endpoint with their passcode'
        });
        
      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error);
        errorCount++;
        migrationResults.push({
          userId: user.id,
          email: user.email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'EVM address migration analysis complete',
      totalUsers: usersToMigrate.length,
      migratedCount,
      errorCount,
      results: migrationResults,
      instructions: {
        userAction: 'Users need to call /api/user/migrate-my-evm-address with their passcode',
        reason: 'Passcode is required to reconstruct the wallet and derive the correct EVM address'
      }
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET endpoint to check migration status
export async function GET() {
  try {
    // Use raw SQL to query evmAddress field
    const usersWithEvmAddresses = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "User" WHERE "evmAddress" IS NOT NULL
    `;

    const usersWithMpcData = await prisma.user.count({
      where: {
        usesMPC: true,
        mpcServerShare: { not: null },
        mpcSalt: { not: null },
        mpcBackupShare: { not: null }
      }
    });

    return NextResponse.json({
      totalUsersWithEvmAddresses: Number(usersWithEvmAddresses[0]?.count || 0),
      totalUsersWithMpcData: usersWithMpcData,
      migrationNeeded: Number(usersWithEvmAddresses[0]?.count || 0) > 0,
      note: 'Users with EVM addresses may have fake addresses that need migration'
    });

  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 