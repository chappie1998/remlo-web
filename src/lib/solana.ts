import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from '@solana/spl-token';
import connectionPool from './solana-connection-pool';

// The network can be 'mainnet-beta', 'testnet', or 'devnet'
export const SOLANA_NETWORK = 'devnet';

// RPC URL from environment or fallback to public endpoints
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(SOLANA_NETWORK);

// SPL token addresses
export const SPL_TOKEN_ADDRESS = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';
export const USDS_TOKEN_ADDRESS = '5jMCx4W5425TPRj23KRng5nbyaZkZiD47yLXDkk5tLAV';

// Relayer service URL
export const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://192.168.1.106:3001';

/**
 * Gets a Connection for Solana from the connection pool
 */
export function getSolanaConnection(): Connection {
  return connectionPool.getConnection(SOLANA_RPC_URL);
}

/**
 * Fetch the SOL balance of a Solana address
 */
export async function fetchAccountBalance(address: string): Promise<{
  balanceInLamports: number;
  balanceInSol: string;
}> {
  try {
    // Validate the address format
    const publicKey = new PublicKey(address);

    const connection = getSolanaConnection();

    // Fetch the balance in lamports (smallest unit of SOL)
    const balanceInLamports = await connection.getBalance(publicKey);

    // Convert lamports to SOL for better readability
    const balanceInSol = (balanceInLamports / LAMPORTS_PER_SOL).toFixed(9);

    return {
      balanceInLamports,
      balanceInSol,
    };
  } catch (error) {
    console.error('Error fetching Solana account balance:', error);
    throw error;
  }
}

/**
 * Fetch the SPL token balance of a Solana address
 */
export async function fetchSplTokenBalance(address: string, tokenAddress = SPL_TOKEN_ADDRESS): Promise<{
  balance: number;
  formattedBalance: string;
}> {
  try {
    // Validate the addresses
    const publicKey = new PublicKey(address);
    const tokenMint = new PublicKey(tokenAddress);

    const connection = getSolanaConnection();

    // Get the associated token account address
    const associatedTokenAddress = await getAssociatedTokenAddress(tokenMint, publicKey);

    try {
      // Get token account info
      const tokenAccount = await getAccount(connection, associatedTokenAddress);
      const balance = Number(tokenAccount.amount);

      // Convert to readable format (using 6 decimals for SPL token)
      const TOKEN_DECIMALS = 6;
      const formattedBalance = (balance / (10 ** TOKEN_DECIMALS)).toFixed(TOKEN_DECIMALS);

      return {
        balance,
        formattedBalance,
      };
    } catch (error) {
      // If the token account doesn't exist or is invalid, return zero balance
      if (
        error instanceof TokenAccountNotFoundError ||
        error instanceof TokenInvalidAccountOwnerError
      ) {
        return {
          balance: 0,
          formattedBalance: '0.000000',
        };
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching SPL token balance:', error);

    // Try fetching from relayer as a fallback
    try {
      const response = await fetch(`${RELAYER_URL}/api/token-balance/${address}`);
      if (response.ok) {
        const data = await response.json();
        return {
          balance: data.balance,
          formattedBalance: data.formattedBalance,
        };
      }
    } catch (relayerError) {
      console.error('Error fetching from relayer:', relayerError);
    }

    // If all else fails, return zero
    return {
      balance: 0,
      formattedBalance: '0.000000',
    };
  }
}

/**
 * Fetch the USDs token balance of a Solana address
 */
export async function fetchUsdsTokenBalance(address: string): Promise<{
  balance: number;
  formattedBalance: string;
}> {
  return fetchSplTokenBalance(address, USDS_TOKEN_ADDRESS);
}

/**
 * Format SOL amount for display
 */
export function formatSolAmount(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(9);
}

/**
 * Check if a string is a valid Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}
