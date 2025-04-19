// Define the TokenInfo interface
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
    address: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // User's specific token
    symbol: 'TEST',
    name: 'Test Token',
    decimals: 6, // Based on Solscan data for this token
    logoURI: 'https://cryptologos.cc/logos/solana-sol-logo.png?v=029', // Placeholder logo
  },
];

import { PublicKey, Connection } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { getSolanaConnection } from "./solana";

/**
 * Get the balance of a specific token for a wallet using RPC method
 * @param tokenMint The mint address of the token
 * @param ownerAddress The wallet address to check
 * @returns The token amount and formatted amount
 */
export async function getTokenBalance(
  tokenMint: string,
  ownerAddress: string
): Promise<{
  tokenAmount: number;
  formattedAmount: string;
}> {
  try {
    console.log(`Fetching token balance for ${tokenMint} owned by ${ownerAddress}`);

    // Find the token info to get decimals
    const tokenInfo = DEVNET_TEST_TOKENS.find(token => token.address === tokenMint);
    const decimals = tokenInfo?.decimals || 9; // Default to 9 if not found

    const connection = getSolanaConnection();

    // Use getTokenAccountsByOwner RPC method which is more reliable
    const response = await connection.getTokenAccountsByOwner(
      new PublicKey(ownerAddress),
      {
        mint: new PublicKey(tokenMint)
      }
    );

    console.log(`Got response with ${response.value.length} token accounts`);

    // If no accounts found, return zero balance
    if (response.value.length === 0) {
      console.log(`No token accounts found for ${tokenMint}`);
      return {
        tokenAmount: 0,
        formattedAmount: '0',
      };
    }

    // Get the token amount from the first account found
    const accountInfo = response.value[0].account.data.parsed.info.tokenAmount;
    const tokenAmount = Number(accountInfo.amount);
    const formattedAmount = accountInfo.uiAmountString;

    console.log(`Token amount: ${tokenAmount}, Formatted: ${formattedAmount}`);

    return {
      tokenAmount,
      formattedAmount,
    };
  } catch (error) {
    console.error('Error getting token balance:', error);
    return {
      tokenAmount: 0,
      formattedAmount: '0',
    };
  }
}

/**
 * Get balances for multiple tokens at once
 * @param tokenMints Array of token mint addresses
 * @param ownerAddress Wallet address to check
 * @returns Object mapping token addresses to their balances
 */
export async function getMultipleTokenBalances(
  tokenMints: string[],
  ownerAddress: string
): Promise<Record<string, { tokenAmount: number; formattedAmount: string }>> {
  console.log(`Fetching multiple token balances for wallet ${ownerAddress}`);

  const result: Record<string, { tokenAmount: number; formattedAmount: string }> = {};
  const connection = getSolanaConnection();

  try {
    // Get all token accounts for the owner with a single RPC call
    const response = await connection.getTokenAccountsByOwner(
      new PublicKey(ownerAddress),
      {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') // SPL Token program ID
      }
    );

    console.log(`Found ${response.value.length} token accounts for wallet`);

    // Process each token account
    for (const item of response.value) {
      try {
        const accountInfo = item.account.data.parsed.info;
        const mint = accountInfo.mint;

        // Only process tokens that are in our tokenMints list
        if (tokenMints.includes(mint)) {
          const tokenAmount = Number(accountInfo.tokenAmount.amount);
          const formattedAmount = accountInfo.tokenAmount.uiAmountString;

          result[mint] = {
            tokenAmount,
            formattedAmount,
          };

          console.log(`Token ${mint}: ${formattedAmount}`);
        }
      } catch (err) {
        console.error('Error parsing token account:', err);
      }
    }

    // Add zero balances for any tokens that weren't found
    for (const mint of tokenMints) {
      if (!result[mint]) {
        result[mint] = {
          tokenAmount: 0,
          formattedAmount: '0',
        };
      }
    }

    return result;
  } catch (error) {
    console.error('Error getting multiple token balances:', error);

    // Return zero balances for all requested tokens
    return tokenMints.reduce((acc, mint) => {
      acc[mint] = { tokenAmount: 0, formattedAmount: '0' };
      return acc;
    }, {} as Record<string, { tokenAmount: number; formattedAmount: string }>);
  }
}
