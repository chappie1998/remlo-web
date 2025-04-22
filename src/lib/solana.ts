import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  clusterApiUrl
} from "@solana/web3.js";
import {
  TokenAccountNotFoundError,
  getAccount,
  getAssociatedTokenAddress
} from "@solana/spl-token";

// The token address for the mock SPL token we'll use
export const SPL_TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || "DK6BeXANcJbG9wezEL6Au7RxJWBWHp6tgYGDQs3aRa6E";
export const USDC_TOKEN_ADDRESS = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

// Choose the cluster based on environment
export const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
export const SOLANA_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  (SOLANA_NETWORK === "mainnet"
    ? "https://api.mainnet-beta.solana.com"
    : clusterApiUrl("devnet"));

// Check if a string is a valid Solana address
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

// Get the SOL balance for an address
export async function getSolBalance(address: string): Promise<number> {
  const connection = new Connection(SOLANA_ENDPOINT);
  const publicKey = new PublicKey(address);
  const balance = await connection.getBalance(publicKey);
  return balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
}

// Get the token balance for an address and token
export async function getTokenBalance(walletAddress: string, tokenMintAddress: string): Promise<number | undefined> {
  try {
    const connection = new Connection(SOLANA_ENDPOINT);
    const walletPublicKey = new PublicKey(walletAddress);
    const tokenMintPublicKey = new PublicKey(tokenMintAddress);

    // Get the associated token account
    const tokenAccount = await getAssociatedTokenAddress(
      tokenMintPublicKey,
      walletPublicKey
    );

    try {
      // Get the token account info
      const accountInfo = await getAccount(connection, tokenAccount);
      return Number(accountInfo.amount); // Return the token amount
    } catch (error) {
      // If the account doesn't exist, return 0
      if (error instanceof TokenAccountNotFoundError) {
        return 0;
      }
      throw error;
    }
  } catch (error) {
    console.error("Error fetching token balance:", error);
    return undefined;
  }
}

// Format a SOL balance for display
export function formatSolBalance(balance: number): string {
  return balance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 9,
  });
}

// Format a token balance for display
export function formatTokenBalance(balance: number | undefined, decimals: number = 6): string {
  if (balance === undefined) return "0";
  return (balance / Math.pow(10, decimals)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
