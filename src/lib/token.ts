import {
  PublicKey,
  Connection,
  Keypair,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  getMint,
} from '@solana/spl-token';
import { getSolanaConnection } from './solana';

/**
 * Interface for token information
 */
export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// Some example tokens on devnet for testing
export const DEVNET_TEST_TOKENS: TokenInfo[] = [
  {
    address: 'So11111111111111111111111111111111111111112', // Native SOL wrapped as SPL
    symbol: 'SOL',
    name: 'Wrapped SOL',
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  },
  {
    address: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // User's custom SPL token
    symbol: 'CUSTOM',
    name: 'Custom Token',
    decimals: 9, // Adjust this to match your token's decimals (typically 9 for Solana tokens)
    logoURI: 'https://cryptologos.cc/logos/solana-sol-logo.png', // Placeholder logo
  },
];

/**
 * Get the balance of a specific SPL token for an address
 */
export async function getTokenBalance(
  tokenMint: string,
  ownerAddress: string
): Promise<{
  tokenAmount: number;
  formattedAmount: string;
}> {
  try {
    const connection = getSolanaConnection();
    const mintPubkey = new PublicKey(tokenMint);
    const ownerPubkey = new PublicKey(ownerAddress);

    // Get the associated token account
    const tokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      ownerPubkey
    );

    try {
      // Get the account info
      const accountInfo = await getAccount(connection, tokenAccount);

      // Get the token decimals for formatting
      const mintInfo = await getMint(connection, mintPubkey);

      // Calculate the formatted amount
      const formattedAmount = (Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals)).toFixed(mintInfo.decimals);

      return {
        tokenAmount: Number(accountInfo.amount),
        formattedAmount,
      };
    } catch (error) {
      // Account doesn't exist or has no balance
      return {
        tokenAmount: 0,
        formattedAmount: '0',
      };
    }
  } catch (error) {
    console.error('Error getting token balance:', error);
    throw error;
  }
}

/**
 * Get multiple token balances for an address
 */
export async function getMultipleTokenBalances(
  tokenMints: string[],
  ownerAddress: string
): Promise<Record<string, { tokenAmount: number; formattedAmount: string }>> {
  try {
    const balances: Record<string, { tokenAmount: number; formattedAmount: string }> = {};

    // Get balance for each token mint
    for (const mint of tokenMints) {
      try {
        balances[mint] = await getTokenBalance(mint, ownerAddress);
      } catch (error) {
        console.error(`Error getting balance for token ${mint}:`, error);
        balances[mint] = { tokenAmount: 0, formattedAmount: '0' };
      }
    }

    return balances;
  } catch (error) {
    console.error('Error getting multiple token balances:', error);
    throw error;
  }
}

/**
 * Create a transaction to transfer SPL tokens
 */
export async function createTokenTransferTransaction(
  keypair: Keypair,
  tokenMint: string,
  toAddress: string,
  amount: number,
): Promise<Transaction> {
  try {
    const connection = getSolanaConnection();
    const mintPubkey = new PublicKey(tokenMint);
    const toPubkey = new PublicKey(toAddress);

    // Get the associated token accounts for sender and receiver
    const fromTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      keypair.publicKey
    );

    const toTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      toPubkey
    );

    // Create the transaction
    const transaction = new Transaction();

    // Check if the recipient's token account exists
    let toTokenAccountInfo;
    try {
      toTokenAccountInfo = await getAccount(connection, toTokenAccount);
    } catch (error) {
      // Add instruction to create the associated token account if it doesn't exist
      transaction.add(
        createAssociatedTokenAccountInstruction(
          keypair.publicKey, // fee payer
          toTokenAccount,
          toPubkey,
          mintPubkey
        )
      );
    }

    // Add token transfer instruction
    transaction.add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        keypair.publicKey,
        amount
      )
    );

    // Get a fresh blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = keypair.publicKey;

    return transaction;
  } catch (error) {
    console.error('Error creating token transfer transaction:', error);
    throw error;
  }
}

/**
 * Format token amount based on decimals
 */
export function formatTokenAmount(amount: number, decimals: number): string {
  return (amount / Math.pow(10, decimals)).toFixed(decimals);
}

/**
 * Parse token amount from user input based on decimals
 */
export function parseTokenAmount(amount: string, decimals: number): number {
  return Math.floor(parseFloat(amount) * Math.pow(10, decimals));
}

/**
 * Check if a token account exists for the given mint and owner
 */
export async function doesTokenAccountExist(
  tokenMint: string,
  ownerAddress: string
): Promise<boolean> {
  try {
    const connection = getSolanaConnection();
    const mintPubkey = new PublicKey(tokenMint);
    const ownerPubkey = new PublicKey(ownerAddress);

    // Get the associated token account address
    const tokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      ownerPubkey
    );

    // Try to get the account info
    try {
      await getAccount(connection, tokenAccount);
      return true;
    } catch (error) {
      return false;
    }
  } catch (error) {
    console.error('Error checking token account:', error);
    return false;
  }
}

/**
 * Fetch token details (mint info)
 */
export async function getTokenDetails(tokenMint: string): Promise<{
  address: string;
  decimals: number;
  supply: string;
}> {
  try {
    const connection = getSolanaConnection();
    const mintPubkey = new PublicKey(tokenMint);

    // Get the mint info
    const mintInfo = await getMint(connection, mintPubkey);

    return {
      address: tokenMint,
      decimals: mintInfo.decimals,
      supply: mintInfo.supply.toString(),
    };
  } catch (error) {
    console.error('Error getting token details:', error);
    throw error;
  }
}
