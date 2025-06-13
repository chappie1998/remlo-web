import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { reconstructCrossChainWallet } from "@/lib/cross-chain-wallet";
import { isValidPasscode } from "@/lib/utils";
import { authOptions } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/jwt";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    let userEmail = null;

    // Get the user from session or JWT
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      userEmail = session.user.email;
    } else {
      const userData = await getUserFromRequest(req);
      if (userData?.email) {
        userEmail = userData.email;
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: "You must be signed in to migrate your EVM address" },
        { status: 401 }
      );
    }

    const { passcode } = await req.json();

    if (!isValidPasscode(passcode)) {
      return NextResponse.json(
        { error: "Passcode must be 6 digits" },
        { status: 400 }
      );
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        email: true,
        usesMPC: true,
        mpcServerShare: true,
        mpcSalt: true,
        mpcBackupShare: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (!user.usesMPC || !user.mpcServerShare || !user.mpcSalt || !user.mpcBackupShare) {
      return NextResponse.json(
        { error: "User does not have MPC wallet setup" },
        { status: 400 }
      );
    }

    // Get current EVM address using raw SQL
    const currentUserData = await prisma.$queryRaw<Array<{ evmAddress: string | null }>>`
      SELECT "evmAddress" FROM "User" WHERE email = ${userEmail}
    `;

    const currentEvmAddress = currentUserData[0]?.evmAddress;

    try {
      // Reconstruct the cross-chain wallet using the user's passcode
      const crossChainWallet = reconstructCrossChainWallet(passcode, {
        serverShare: user.mpcServerShare,
        backupShare: user.mpcBackupShare,
        salt: user.mpcSalt
      });

      if (!crossChainWallet) {
        return NextResponse.json(
          { error: "Invalid passcode" },
          { status: 401 }
        );
      }

      const newEvmAddress = crossChainWallet.evm.address;

      // Update the user's EVM address using raw SQL
      await prisma.$executeRaw`
        UPDATE "User" SET "evmAddress" = ${newEvmAddress} WHERE email = ${userEmail}
      `;

      console.log(`✅ Migrated EVM address for ${userEmail}: ${currentEvmAddress} → ${newEvmAddress}`);

      return NextResponse.json({
        success: true,
        message: "EVM address migrated successfully",
        migration: {
          oldAddress: currentEvmAddress,
          newAddress: newEvmAddress,
          addressChanged: currentEvmAddress !== newEvmAddress
        }
      });

    } catch (error) {
      console.error('Error reconstructing wallet:', error);
      return NextResponse.json(
        { error: "Failed to reconstruct wallet. Please check your passcode." },
        { status: 400 }
      );
    }

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

// GET endpoint to check if user needs migration
export async function GET(req: NextRequest) {
  try {
    let userEmail = null;

    // Get the user from session or JWT
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      userEmail = session.user.email;
    } else {
      const userData = await getUserFromRequest(req);
      if (userData?.email) {
        userEmail = userData.email;
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: "You must be signed in" },
        { status: 401 }
      );
    }

    // Get user data using raw SQL for evmAddress
    const userData = await prisma.$queryRaw<Array<{
      evmAddress: string | null;
      usesMPC: boolean;
      mpcServerShare: string | null;
      mpcSalt: string | null;
      mpcBackupShare: string | null;
    }>>`
      SELECT "evmAddress", "usesMPC", "mpcServerShare", "mpcSalt", "mpcBackupShare" 
      FROM "User" WHERE email = ${userEmail}
    `;

    const user = userData[0];

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const hasEvmAddress = !!user.evmAddress;
    const hasMpcSetup = user.usesMPC && !!user.mpcServerShare && !!user.mpcSalt && !!user.mpcBackupShare;

    return NextResponse.json({
      hasEvmAddress,
      hasMpcSetup,
      currentEvmAddress: user.evmAddress,
      migrationRecommended: hasEvmAddress && hasMpcSetup,
      message: hasEvmAddress 
        ? "You have an EVM address that may need migration to ensure it's properly derived"
        : "No EVM address found - will be created when you access cross-chain features"
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