/**
 * Application Configuration
 * 
 * This file contains centralized configuration settings for the application.
 * Using this file ensures consistency and makes it easier to update environment-specific values.
 */

// Base URLs
export const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Solana network configuration
export const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
export const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// Authentication settings
export const AUTH_SECRET = process.env.AUTH_SECRET;
export const NEXTAUTH_URL = process.env.NEXTAUTH_URL || APP_URL;

// Feature flags
export const ENABLE_FAUCET = process.env.NEXT_PUBLIC_ENABLE_FAUCET === 'true';
export const ENABLE_MPC = process.env.NEXT_PUBLIC_ENABLE_MPC !== 'false';

export const BASE_URL_LINK = "https://beta-remlo.vercel.app"

export default {
  RELAYER_URL,
  APP_URL,
  SOLANA_NETWORK,
  SOLANA_RPC_URL,
  AUTH_SECRET,
  NEXTAUTH_URL,
  ENABLE_FAUCET,
  ENABLE_MPC,
}; 