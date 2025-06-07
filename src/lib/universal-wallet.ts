/**
 * Universal Wallet Manager
 * Abstracts Solana and Base operations for seamless user experience
 */

import { PrismaClient } from "@prisma/client";
import { getPreferredChainForToken, BASE_CONFIG, parseBaseAmount } from "./base-config";
import { fetchAllBalances as fetchSolanaBalances } from "./solana";

const prisma = new PrismaClient();

export interface UniversalBalance {
  symbol: string;
  name: string;
  balance: string;
  usdValue?: string;
  blockchain: 'solana' | 'base';
  address?: string;
}

export interface UniversalTransferParams {
  fromUserId: string;
  toUsername: string;
  amount: string;
  tokenSymbol: string;
  note?: string;
}

export interface UserWalletStatus {
  hasAnyWallet: boolean;
  hasSolanaWallet: boolean;
  hasBaseWallet: boolean;
  solanaAddress?: string;
  baseAddress?: string;
  username?: string;
}

/**
 * Get user's wallet status across all chains
 */
export async function getUserWalletStatus(userId: string): Promise<UserWalletStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      hasPasscode: true,
      solanaAddress: true,
      hasOktoWallet: true,
      baseAddress: true,
      username: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const hasSolanaWallet = !!(user.hasPasscode && user.solanaAddress);
  const hasBaseWallet = !!(user.hasOktoWallet && user.baseAddress);

  return {
    hasAnyWallet: hasSolanaWallet || hasBaseWallet,
    hasSolanaWallet,
    hasBaseWallet,
    solanaAddress: user.solanaAddress || undefined,
    baseAddress: user.baseAddress || undefined,
    username: user.username || undefined,
  };
}

/**
 * Get unified balance across all user's wallets
 */
export async function getUniversalBalance(userId: string): Promise<UniversalBalance[]> {
  const walletStatus = await getUserWalletStatus(userId);
  const balances: UniversalBalance[] = [];

  // Fetch Solana balances if user has Solana wallet
  if (walletStatus.hasSolanaWallet && walletStatus.solanaAddress) {
    try {
      const solanaBalances = await fetchSolanaBalances(walletStatus.solanaAddress);
      
      balances.push({
        symbol: 'USDC',
        name: 'USD Coin (Solana)',
        balance: solanaBalances.usdc.formattedBalance,
        blockchain: 'solana',
        address: walletStatus.solanaAddress,
      });

      balances.push({
        symbol: 'USDS',
        name: 'USD Stablecoin',
        balance: solanaBalances.usds.formattedBalance,
        blockchain: 'solana',
        address: walletStatus.solanaAddress,
      });
    } catch (error) {
      console.error('Error fetching Solana balances:', error);
    }
  }

  // Fetch Base balances if user has Base wallet
  if (walletStatus.hasBaseWallet && walletStatus.baseAddress) {
    try {
      // This will be implemented when we integrate with Okto SDK
      // For now, we'll add placeholder balances
      balances.push({
        symbol: 'USDC',
        name: 'USD Coin (Base)',
        balance: '0.000000',
        blockchain: 'base',
        address: walletStatus.baseAddress,
      });

      balances.push({
        symbol: 'ETH',
        name: 'Ethereum',
        balance: '0.0000',
        blockchain: 'base',
        address: walletStatus.baseAddress,
      });
    } catch (error) {
      console.error('Error fetching Base balances:', error);
    }
  }

  return balances;
}

/**
 * Find user by username and get their wallet addresses
 */
export async function findUserByUsername(username: string): Promise<{
  id: string;
  username: string;
  solanaAddress?: string;
  baseAddress?: string;
  canReceiveSolana: boolean;
  canReceiveBase: boolean;
} | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      solanaAddress: true,
      baseAddress: true,
      hasPasscode: true,
      hasOktoWallet: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    username: user.username!,
    solanaAddress: user.solanaAddress || undefined,
    baseAddress: user.baseAddress || undefined,
    canReceiveSolana: !!(user.hasPasscode && user.solanaAddress),
    canReceiveBase: !!(user.hasOktoWallet && user.baseAddress),
  };
}

/**
 * Determine the best route for a transfer
 */
export function determineTransferRoute(
  tokenSymbol: string,
  senderWalletStatus: UserWalletStatus,
  recipientWalletStatus: { canReceiveSolana: boolean; canReceiveBase: boolean }
): {
  blockchain: 'solana' | 'base';
  possible: boolean;
  reason?: string;
} {
  const preferredChain = getPreferredChainForToken(tokenSymbol);
  
  // Check if sender has the preferred chain wallet
  const senderHasPreferred = preferredChain === 'solana' 
    ? senderWalletStatus.hasSolanaWallet 
    : senderWalletStatus.hasBaseWallet;

  // Check if recipient can receive on preferred chain
  const recipientCanReceivePreferred = preferredChain === 'solana'
    ? recipientWalletStatus.canReceiveSolana
    : recipientWalletStatus.canReceiveBase;

  // If preferred chain works for both, use it
  if (senderHasPreferred && recipientCanReceivePreferred) {
    return { blockchain: preferredChain, possible: true };
  }

  // Try alternative chain for USDC (available on both)
  if (tokenSymbol.toUpperCase() === 'USDC') {
    const altChain: 'solana' | 'base' = preferredChain === 'solana' ? 'base' : 'solana';
    const senderHasAlt = altChain === 'solana' 
      ? senderWalletStatus.hasSolanaWallet 
      : senderWalletStatus.hasBaseWallet;
    const recipientCanReceiveAlt = altChain === 'solana'
      ? recipientWalletStatus.canReceiveSolana
      : recipientWalletStatus.canReceiveBase;

    if (senderHasAlt && recipientCanReceiveAlt) {
      return { blockchain: altChain, possible: true };
    }
  }

  // Transfer not possible
  let reason = '';
  if (!senderHasPreferred) {
    reason = `You don't have a ${preferredChain} wallet for ${tokenSymbol}`;
  } else if (!recipientCanReceivePreferred) {
    reason = `Recipient can't receive ${tokenSymbol} on ${preferredChain}`;
  }

  return { blockchain: preferredChain, possible: false, reason };
}

/**
 * Create a universal transaction record
 */
export async function createUniversalTransaction(params: {
  userId: string;
  recipientUserId?: string;
  recipientUsername?: string;
  amount: string;
  tokenSymbol: string;
  blockchain: 'solana' | 'base';
  network: string;
  note?: string;
}): Promise<string> {
  const transaction = await prisma.universalTransaction.create({
    data: {
      userId: params.userId,
      recipientUserId: params.recipientUserId,
      recipientUsername: params.recipientUsername,
      amount: params.amount,
      tokenSymbol: params.tokenSymbol,
      status: 'pending',
      blockchain: params.blockchain,
      network: params.network,
      note: params.note,
      transactionType: 'transfer',
    },
  });

  return transaction.id;
}

/**
 * Update universal transaction with chain-specific details
 */
export async function updateUniversalTransaction(
  transactionId: string,
  updates: {
    status?: string;
    solanaSignature?: string;
    baseTxHash?: string;
    oktoJobId?: string;
    confirmedAt?: Date;
  }
): Promise<void> {
  await prisma.universalTransaction.update({
    where: { id: transactionId },
    data: {
      ...updates,
      ...(updates.status === 'confirmed' && !updates.confirmedAt 
        ? { confirmedAt: new Date() } 
        : {}),
    },
  });
}

/**
 * Get user transaction history across all chains
 */
export async function getUniversalTransactionHistory(
  userId: string,
  limit = 50
): Promise<Array<{
  id: string;
  amount: string;
  tokenSymbol: string;
  status: string;
  blockchain: 'solana' | 'base';
  recipientUsername?: string;
  note?: string;
  createdAt: Date;
  confirmedAt?: Date;
  signature?: string;
}>> {
  const transactions = await prisma.universalTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      amount: true,
      tokenSymbol: true,
      status: true,
      blockchain: true,
      recipientUsername: true,
      note: true,
      createdAt: true,
      confirmedAt: true,
      solanaSignature: true,
      baseTxHash: true,
    },
  });

  return transactions.map(tx => ({
    ...tx,
    signature: tx.solanaSignature || tx.baseTxHash || undefined,
  }));
}

/**
 * Check if a transfer is possible between two users
 */
export async function canTransferBetweenUsers(
  fromUserId: string,
  toUsername: string,
  tokenSymbol: string
): Promise<{
  possible: boolean;
  route?: 'solana' | 'base';
  reason?: string;
}> {
  const senderStatus = await getUserWalletStatus(fromUserId);
  const recipient = await findUserByUsername(toUsername);

  if (!recipient) {
    return { possible: false, reason: 'Recipient not found' };
  }

  if (!senderStatus.hasAnyWallet) {
    return { possible: false, reason: 'You need to set up a wallet first' };
  }

  const route = determineTransferRoute(tokenSymbol, senderStatus, {
    canReceiveSolana: recipient.canReceiveSolana,
    canReceiveBase: recipient.canReceiveBase,
  });

  return {
    possible: route.possible,
    route: route.possible ? route.blockchain : undefined,
    reason: route.reason,
  };
} 