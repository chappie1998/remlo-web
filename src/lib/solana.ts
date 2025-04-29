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
import bs58 from "bs58";

// The network can be 'mainnet-beta', 'testnet', or 'devnet'
export const SOLANA_NETWORK = 'devnet';

// RPC URL from environment or fallback to public endpoints
export const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || clusterApiUrl(SOLANA_NETWORK);
// SPL token address
export const SPL_TOKEN_ADDRESS = process.env.USDC_SPL_TOKEN_ADDRESS || "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";

// Relayer service URL
export const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001';

/**
 * Creates a Connection for Solana
 */
export function getSolanaConnection(): Connection {
  console.log(`Creating Solana connection to: ${SOLANA_RPC_URL}`);
  return new Connection(SOLANA_RPC_URL, 'confirmed');
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
  usdcBalance: number;
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
      const USDS_DECIMALS = 9;
      const formattedBalance = (balance / (10 ** TOKEN_DECIMALS)).toFixed(TOKEN_DECIMALS);
      const usdcBalance = await fetchCompressedUSDSBalance(address)
      // const usdsFormattedBalance = (usdc_balance / (10 ** USDS_DECIMALS)).toFixed(USDS_DECIMALS);      
      return {
        balance,
        formattedBalance,
        usdcBalance,
        
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
          usdcBalance: 0,
        };
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching SPL token balance:', error);
    
    // // Try fetching from relayer as a fallback
    // try {
    //   const response = await fetch(`${RELAYER_URL}/api/token-balance/${address}`);
    //   if (response.ok) {
    //     const data = await response.json();
    //     return {
    //       balance: data.balance,
    //       formattedBalance: data.formattedBalance,
    //     };
    //   }
    // } catch (relayerError) {
    //   console.error('Error fetching from relayer:', relayerError);
    // }

    }
    // If all else fails, return zero
    return {
      balance: 0,
      formattedBalance: '0.000000',
      usdcBalance: 0,
    };
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


import { Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, transfer as splTransfer, burn as splBurn } from "@solana/spl-token";
import { createRpc } from "@lightprotocol/stateless.js";
import {
  createMint as createCompressedMint,
  mintToIx as mintCompressedToIx,
  transfer as transferCompressed,
  getCompressedTokenAccountsByOwner
} from "@lightprotocol/compressed-token";

// Fix PublicKey creation by providing a valid fallback address
export const USDS_DEFAULT_ADDRESS = "2QAxBHAhv8wDg1b2qdAY51ToEyfkHHY8pb8f5FcFvBtv";
export const USDC_MINT = new PublicKey(
  process.env.USDS_TOKEN_ADDRESS || USDS_DEFAULT_ADDRESS
);

export const C_SOLANA_RPC_URL = process.env.C_SOLANA_RPC_URL || "https://devnet.helius-rpc.com?api-key=6fae32b2-c09d-4ea5-a553-6eea78192637"

// Fix VAULT keypair creation with proper error handling
// let VAULT: Keypair;
// try {
//   // For development/testing, you can use a random keypair if VAULT_SECRET is not set
//   const secretKeyData = process.env.VAULT_SECRET || "";
//   if (secretKeyData && secretKeyData.length > 0) {
//     VAULT = Keypair.fromSecretKey(Uint8Array.from(Buffer.from(secretKeyData, 'base64')));
//   } else {
//     console.warn("VAULT_SECRET not properly set, using a random keypair for development only");
//     VAULT = Keypair.generate();
//   }
// } catch (error) {
//   console.error("Error creating VAULT keypair:", error);
//   // Fallback to a generated keypair
//   // VAULT = Keypair.generate();
// }

const VAULT = Keypair.fromSecretKey(bs58.decode(process.env.VAULT_SECRET || "3RVoyCcLb83pR8ndmWLFUiuWmwUAMriwxvmR4nso8iM8XE1icAPvvbgFxM8GeGwX8vDRoJbSyr1JtaYhsWLbw8Ts"));
/**
 * Simple compressed-token transfer with vault as fee payer.
 */
export async function simpleCompressedTransfer(USER: Keypair, recipient: PublicKey, amount: number) {
  // Convert amount to token units (using 6 decimals for SPL token)
  const TOKEN_DECIMALS = 9;
  const amountInUnits = Math.floor(Number(amount) * (10 ** TOKEN_DECIMALS));

  const connection = createRpc(SOLANA_RPC_URL, SOLANA_RPC_URL, SOLANA_RPC_URL);
  // Build compressed transfer instruction
  const ix = await transferCompressed(
    connection,
    USER,                   // authority signing the compressed transfer
    USDC_MINT,
    amountInUnits,
    USER,         // from owner
    recipient               // to recipient
  );

  // Send transaction with vault paying fees
  const tx = new Transaction({ feePayer: VAULT.publicKey });
  tx.add(ix);
  tx.partialSign(USER);
  tx.partialSign(VAULT);

  await sendAndConfirmTransaction(connection, tx, [USER, VAULT]);
  console.log(`Transferred ${amount} compressed USDs to ${recipient.toBase58()}`);
}

// Fetch compressed USDs balance for an owner
export async function fetchCompressedUSDSBalance(ownerStr: string): Promise<number> {  
  try {
    const owner = new PublicKey(ownerStr);
    // Make the RPC call
    const response = await fetch(C_SOLANA_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getCompressedTokenAccountsByOwner',
        params: {
          owner: owner,
          limit: 100
        }
      })
    });

    if (!response.ok) {
      throw new Error(`RPC request failed with status ${response.status}`);
    }

    const data = await response.json();    
    
    // Check for RPC errors
    if (data.error) {
      throw new Error(`RPC error: ${JSON.stringify(data.error)}`);
    }
    
    // Look for the USDS token in the results
    const items = data.result?.value?.items || [];
    
    for (const item of items) {
      if (item.tokenData?.mint === USDC_MINT.toBase58()) {
        return item.tokenData.amount;
      }
    }
    
    // Return '0' if not found
    return 0;
  } catch (error) {
    console.error('Error fetching compressed USDS balance:', error);
    return 0;
  }
}

