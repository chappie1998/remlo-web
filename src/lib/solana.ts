import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  clusterApiUrl,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
  getOrCreateAssociatedTokenAccount,
  transfer as splTransfer,
  burn as splBurn
} from '@solana/spl-token';
import bs58 from "bs58";
import { createRpc } from "@lightprotocol/stateless.js";
import {
  createMint as createCompressedMint,
  mintTo,
  transfer,
} from "@lightprotocol/compressed-token";

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

// Fix PublicKey creation by providing a valid fallback address
export const USDS_DEFAULT_ADDRESS = "2QAxBHAhv8wDg1b2qdAY51ToEyfkHHY8pb8f5FcFvBtv";
export const USDC_MINT = new PublicKey(
  process.env.USDS_TOKEN_ADDRESS || USDS_DEFAULT_ADDRESS
);

export const C_SOLANA_RPC_URL = process.env.C_SOLANA_RPC_URL || "https://devnet.helius-rpc.com?api-key=6fae32b2-c09d-4ea5-a553-6eea78192637"

const VAULT = Keypair.fromSecretKey(bs58.decode(process.env.VAULT_SECRET || "3RVoyCcLb83pR8ndmWLFUiuWmwUAMriwxvmR4nso8iM8XE1icAPvvbgFxM8GeGwX8vDRoJbSyr1JtaYhsWLbw8Ts"));

/**
 * Simple compressed-token transfer with vault as fee payer.
 */
export async function simpleCompressedTransfer(USER: Keypair, recipient: PublicKey, amount: number) {
  // const payer = Keypair.generate();
  // Convert amount to token units (using 6 decimals for SPL token)
  const keypair = Keypair.fromSecretKey(USER.secretKey);
  console.log("Solana address (public key):", keypair.publicKey.toBase58());


  const TOKEN_DECIMALS = 9;
  const amountInUnits = Math.floor(Number(amount) * (10 ** TOKEN_DECIMALS));
  const connection = createRpc(C_SOLANA_RPC_URL, C_SOLANA_RPC_URL, C_SOLANA_RPC_URL);
  // Build compressed transfer instruction
  const ix = await transfer(
    connection,
    VAULT,                   // authority signing the compressed transfer
    USDC_MINT,
    amountInUnits,
    keypair,         // from owner
    recipient               // to recipient
  );

  // // Send transaction with vault paying fees
  // const tx = new Transaction({ feePayer: VAULT.publicKey });
  // tx.add(ix);
  // tx.partialSign(USER);
  // const sig = await sendAndConfirmTransaction(
  //   connection,
  //   tx,
  //   [VAULT],    // vault signs here
  //   { preflightCommitment: "confirmed" }
  // );  
  // console.log(`Transferred ${amount} compressed USDs to ${recipient.toBase58()}`);
  // console.log(`Transferred ${amount} USDs → ${recipient.toBase58()}  sig=${sig}`);
  return ix;
}

// Fetch compressed USDs balance for an owner
export async function fetchCompressedUSDSBalance(ownerStr: string): Promise<number> {
  try {
    const owner = new PublicKey(ownerStr);
    const response = await fetch(C_SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getCompressedTokenAccountsByOwner',
        params: { owner, limit: 100 },
      }),
    });
    const { result, error } = await response.json();
    if (error) throw new Error(`RPC error: ${JSON.stringify(error)}`);

    const items = result.value.items as Array<{ tokenData: { mint: string; amount: number } }>;
    const mintStr = USDC_MINT.toBase58();

    // Sum up all amounts from *all* of your compressed token accounts
    const total = items
      .filter(i => i.tokenData.mint === mintStr)
      .reduce((sum, i) => sum + i.tokenData.amount, 0);

    return total; // returns the full total, e.g. 5200000000 + 208400000 + …
  } catch (err) {
    console.error('Error fetching compressed USDS balance:', err);
    return 0;
  }
}


/**
 * Mint compressed tokens to a recipient using the vault as the minter and fee payer.
 * @param recipient Public key of the recipient
 * @param amount Amount to mint (will be converted to token units based on decimals)
 * @returns Transaction signature
 */
export async function mintCompressedToken(recipient: PublicKey, amount: number) {
  // Convert amount to token units (using 9 decimals for USDS token)
  const TOKEN_DECIMALS = 9;
  const amountInUnits = Math.floor(Number(amount) * (10 ** TOKEN_DECIMALS));
  
  // Create RPC connection
  const connection = createRpc(C_SOLANA_RPC_URL, C_SOLANA_RPC_URL, C_SOLANA_RPC_URL);
  
  try {
    // Mint compressed tokens to the recipient
    // The mintTo function returns a transaction ID directly
    const mintToTxId = await mintTo(
      connection,
      VAULT,                // Payer and mint authority
      USDC_MINT,            // Mint address
      recipient,            // Destination
      VAULT,                // Authority
      amountInUnits         // Amount
    );
    
    console.log(`Minted ${amount} compressed USDS to ${recipient.toBase58()}`);
    console.log(`Transaction ID: ${mintToTxId}`);
    
    return {
      success: true,
      txId: mintToTxId,
      amount: amount,
      recipient: recipient.toBase58()
    };
  } catch (error) {
    console.error('Error minting compressed token:', error);
    // Add more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    throw error;
  }
}

// Note: We've removed the swapCompressedToken function since we're now
// handling swaps by using direct USDC transfer + USDS minting in the frontend.

