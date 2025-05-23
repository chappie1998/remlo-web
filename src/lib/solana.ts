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
  AccountLayout,
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
 * OPTIMIZED: Fetch token balances (USDC, USDS) in a single RPC call
 */
export async function fetchAllBalances(address: string): Promise<{
  usdc: { balance: number; formattedBalance: string };
  usds: { balance: number; formattedBalance: string };
}> {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting fetchAllBalances for address:', address);
    
    const publicKey = new PublicKey(address);
    const connection = getSolanaConnection();

    // Get associated token addresses for both tokens
    console.log('⏱️  Getting token mints...');
    const tokenStartTime = Date.now();
    
    const usdcMint = new PublicKey(SPL_TOKEN_ADDRESS);
    const usdsMint = new PublicKey(USDS_TOKEN_ADDRESS);
    
    const [usdcTokenAddress, usdsTokenAddress] = await Promise.all([
      getAssociatedTokenAddress(usdcMint, publicKey),
      getAssociatedTokenAddress(usdsMint, publicKey)
    ]);
    
    console.log(`⚡ Token addresses computed in ${Date.now() - tokenStartTime}ms`);

    // Fetch both token accounts in a single RPC call
    console.log('🌐 Fetching account data from Solana RPC...');
    const rpcStartTime = Date.now();
    
    const accountInfos = await connection.getMultipleAccountsInfo([
      usdcTokenAddress, // USDC token account
      usdsTokenAddress  // USDS token account
    ]);
    
    console.log(`🌐 RPC call completed in ${Date.now() - rpcStartTime}ms`);

    // Process USDC balance
    console.log('🔧 Processing account data...');
    const processStartTime = Date.now();
    
    let usdcBalance = 0;
    let usdcFormatted = '0.000000';
    if (accountInfos[0]?.data) {
      try {
        const accountData = AccountLayout.decode(accountInfos[0].data);
        usdcBalance = Number(accountData.amount);
        usdcFormatted = (usdcBalance / (10 ** 6)).toFixed(6); // USDC has 6 decimals
      } catch (error) {
        console.error('Error decoding USDC account data:', error);
      }
    }

    // Process USDS balance
    let usdsBalance = 0;
    let usdsFormatted = '0.000000';
    if (accountInfos[1]?.data) {
      try {
        const accountData = AccountLayout.decode(accountInfos[1].data);
        usdsBalance = Number(accountData.amount);
        usdsFormatted = (usdsBalance / (10 ** 6)).toFixed(6); // USDS has 6 decimals
      } catch (error) {
        console.error('Error decoding USDS account data:', error);
      }
    }
    
    console.log(`🔧 Processing completed in ${Date.now() - processStartTime}ms`);
    console.log(`✅ Total fetchAllBalances time: ${Date.now() - startTime}ms`);

    return {
      usdc: {
        balance: usdcBalance,
        formattedBalance: usdcFormatted,
      },
      usds: {
        balance: usdsBalance,
        formattedBalance: usdsFormatted,
      }
    };
  } catch (error) {
    console.error('❌ Error fetching token balances:', error);
    console.log(`❌ Failed fetchAllBalances time: ${Date.now() - startTime}ms`);
    
    // Fallback to individual calls if batch fails
    const [usdcBalance, usdsBalance] = await Promise.all([
      fetchSplTokenBalance(address).catch(() => ({ balance: 0, formattedBalance: '0.000000' })),
      fetchUsdsTokenBalance(address).catch(() => ({ balance: 0, formattedBalance: '0.000000' }))
    ]);

    return {
      usdc: usdcBalance,
      usds: usdsBalance,
    };
  }
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
