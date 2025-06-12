import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  createCrossChainWallet,
  reconstructCrossChainWallet,
  migrateSolanaWalletToCrossChain,
  getChainWallet,
  CrossChainWallet
} from '@/lib/cross-chain-wallet';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, passcode, chain } = await request.json();

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    switch (action) {
      case 'create': {
        if (!passcode) {
          return NextResponse.json({ error: 'Passcode required' }, { status: 400 });
        }

        // Create new cross-chain wallet
        const crossChainWallet = createCrossChainWallet(passcode);

        // Update user with cross-chain wallet data
        await prisma.user.update({
          where: { id: user.id },
          data: {
            // Store Solana address (existing field)
            solanaAddress: crossChainWallet.solana.address,
            
            // Store EVM address (new field)
            evmAddress: crossChainWallet.evm.address,
            
            // Store MPC shares (existing fields)
            mpcServerShare: crossChainWallet.mpcShares.serverShare,
            mpcSalt: crossChainWallet.mpcShares.salt,
            mpcBackupShare: crossChainWallet.mpcShares.backupShare,
            usesMPC: true,
          },
        });

        return NextResponse.json({
          success: true,
          wallets: {
            solana: {
              address: crossChainWallet.solana.address,
              publicKey: crossChainWallet.solana.publicKey,
            },
            evm: {
              address: crossChainWallet.evm.address,
              publicKey: crossChainWallet.evm.publicKey,
            },
          },
        });
      }

      case 'migrate': {
        if (!passcode || !user.mpcServerShare || !user.mpcSalt || !user.mpcBackupShare) {
          return NextResponse.json({ error: 'Missing wallet or passcode data' }, { status: 400 });
        }

        // Reconstruct existing Solana wallet
        const existingWallet = reconstructCrossChainWallet(passcode, {
          serverShare: user.mpcServerShare,
          backupShare: user.mpcBackupShare,
          salt: user.mpcSalt,
        });

        if (!existingWallet) {
          return NextResponse.json({ error: 'Failed to reconstruct wallet' }, { status: 400 });
        }

        // Migrate to cross-chain
        const crossChainWallet = migrateSolanaWalletToCrossChain(
          existingWallet.solana.privateKey,
          passcode
        );

        // Update user with new cross-chain data
        await prisma.user.update({
          where: { id: user.id },
          data: {
            evmAddress: crossChainWallet.evm.address,
            mpcServerShare: crossChainWallet.mpcShares.serverShare,
            mpcSalt: crossChainWallet.mpcShares.salt,
            mpcBackupShare: crossChainWallet.mpcShares.backupShare,
          },
        });

        return NextResponse.json({
          success: true,
          wallets: {
            solana: {
              address: crossChainWallet.solana.address,
              publicKey: crossChainWallet.solana.publicKey,
            },
            evm: {
              address: crossChainWallet.evm.address,
              publicKey: crossChainWallet.evm.publicKey,
            },
          },
        });
      }

      case 'get': {
        if (!passcode || !user.mpcServerShare || !user.mpcSalt || !user.mpcBackupShare) {
          return NextResponse.json({ error: 'Missing wallet or passcode data' }, { status: 400 });
        }

        // Reconstruct cross-chain wallet
        const crossChainWallet = reconstructCrossChainWallet(passcode, {
          serverShare: user.mpcServerShare,
          backupShare: user.mpcBackupShare,
          salt: user.mpcSalt,
        });

        if (!crossChainWallet) {
          return NextResponse.json({ error: 'Failed to reconstruct wallet' }, { status: 400 });
        }

        // Get specific chain wallet if requested
        if (chain) {
          const chainWallet = getChainWallet(crossChainWallet, chain);
          return NextResponse.json({
            success: true,
            chain,
            wallet: {
              address: chainWallet.address,
              publicKey: chainWallet.publicKey,
            },
          });
        }

        // Return all wallets
        return NextResponse.json({
          success: true,
          wallets: {
            solana: {
              address: crossChainWallet.solana.address,
              publicKey: crossChainWallet.solana.publicKey,
            },
            evm: {
              address: crossChainWallet.evm.address,
              publicKey: crossChainWallet.evm.publicKey,
            },
          },
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Cross-chain wallet error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain');

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return wallet info without sensitive data
    const walletInfo: any = {
      hasCrossChainWallet: !!(user.mpcServerShare && user.mpcSalt && user.mpcBackupShare),
      solanaAddress: user.solanaAddress,
      evmAddress: user.evmAddress,
    };

    if (chain) {
      walletInfo.requestedChain = chain;
    }

    return NextResponse.json({
      success: true,
      ...walletInfo,
    });
  } catch (error) {
    console.error('Cross-chain wallet info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 