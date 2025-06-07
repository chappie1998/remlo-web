/**
 * Base Blockchain Configuration
 * Handles Base Sepolia network settings and Okto integration
 */

export const BASE_CONFIG = {
  NETWORK: {
    chainId: 84532, // Base Sepolia
    name: "Base Sepolia",
    rpcUrl: "https://sepolia.base.org",
    blockExplorer: "https://sepolia-explorer.base.org",
    caip2Id: "eip155:84532", // Base Sepolia CAIP-2 ID for Okto
    isTestnet: true,
  },
  
  TOKENS: {
    USDC: {
      address: "0x323e78f944A9a1FcF3a10efcC5319DBb0bB6e673", // Your deployed USDC
      decimals: 6,
      symbol: "USDC",
      name: "USD Coin",
      coingeckoId: "usd-coin",
    },
    ETH: {
      address: "", // Native token (empty string for Okto)
      decimals: 18,
      symbol: "ETH", 
      name: "Ethereum",
      coingeckoId: "ethereum",
    },
  },
  
  OKTO: {
    environment: (process.env.NEXT_PUBLIC_OKTO_ENVIRONMENT || process.env.VITE_OKTO_ENVIRONMENT || "sandbox") as "sandbox" | "production",
    clientPrivateKey: process.env.NEXT_PUBLIC_OKTO_CLIENT_PRIVATE_KEY || process.env.VITE_OKTO_CLIENT_PRIVATE_KEY || "0xc206dc35bd93482f31fcca9a133fdd9249da73b9838c5a768f5b1c2f355d93ba",
    clientSWA: process.env.NEXT_PUBLIC_OKTO_CLIENT_SWA || process.env.VITE_OKTO_CLIENT_SWA || "0x384329E7E4Ef201F2d129dDFA0FcB420B83975D2",
    treasuryApiKey: process.env.OKTO_TREASURY_API_KEY || "0xfd3cf52cc0ea833572ddee613c891752e507a06e4026c88d5846ff1d3cf5ae13",
    paymasterSWA: process.env.OKTO_PAYMASTER_SWA || "0x06781f10f82D930f70C90818DB942f6957f78826",
    treasuryWallet: process.env.OKTO_TREASURY_WALLET || "0xD6794ca1EF92336eCc33E7316892a14F6dc409f1",
    sponsorshipEnabled: true, // Enable gas-free transactions
  },
} as const;

// Helper functions for Base blockchain operations
export function formatBaseAmount(amount: string | number, decimals: number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const formatted = num / Math.pow(10, decimals);
  return formatted.toFixed(decimals === 6 ? 6 : 4);
}

export function parseBaseAmount(amount: string, decimals: number): bigint {
  const num = parseFloat(amount) * Math.pow(10, decimals);
  return BigInt(Math.floor(num));
}

export function getTokenConfig(symbol: string) {
  const upperSymbol = symbol.toUpperCase() as keyof typeof BASE_CONFIG.TOKENS;
  return BASE_CONFIG.TOKENS[upperSymbol] || null;
}

export function isValidBaseAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Chain abstraction helpers
export function getPreferredChainForToken(tokenSymbol: string): 'solana' | 'base' {
  const symbol = tokenSymbol.toUpperCase();
  
  // USDC can be on both chains, prefer Base for lower fees
  if (symbol === 'USDC') return 'base';
  
  // USDS is Solana-specific
  if (symbol === 'USDS') return 'solana';
  
  // ETH is Base-specific
  if (symbol === 'ETH') return 'base';
  
  // SOL is Solana-specific
  if (symbol === 'SOL') return 'solana';
  
  // Default to Solana for unknown tokens
  return 'solana';
}

export function getSupportedTokensForUser(): Array<{
  symbol: string;
  name: string;
  blockchain: 'solana' | 'base';
  preferred: boolean;
}> {
  return [
    { symbol: 'USDC', name: 'USD Coin', blockchain: 'base', preferred: true },
    { symbol: 'USDC', name: 'USD Coin (Solana)', blockchain: 'solana', preferred: false },
    { symbol: 'USDS', name: 'USD Stablecoin', blockchain: 'solana', preferred: true },
    { symbol: 'ETH', name: 'Ethereum', blockchain: 'base', preferred: true },
    { symbol: 'SOL', name: 'Solana', blockchain: 'solana', preferred: true },
  ];
} 