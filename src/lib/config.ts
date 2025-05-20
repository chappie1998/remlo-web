/**
 * Global application configuration
 */

// Base URL configuration for the application
export const APP_CONFIG = {
  // Base URL for the application - used for generating payment links
  // In production, set the NEXT_PUBLIC_BASE_URL environment variable
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 
    (typeof window !== 'undefined' 
      ? window.location.origin 
      : 'http://localhost:3000'),
    
  // The default Solana network to use
  solanaNetwork: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
  
  // Default Solana RPC URL
  solanaRpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
};

/**
 * Get the base URL for the application
 * This function handles server-side and client-side rendering
 */
export function getBaseUrl(req?: Request): string {
  // If we have an environment variable, use that
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  // If we're in a browser, use the current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // For server-side rendering with no env var, try to get from request
  if (req) {
    const url = new URL(req.url);
    return url.origin;
  }
  
  // Default fallback
  return 'http://localhost:3000';
}

/**
 * Generate a payment link for a given shortId
 */
export function generatePaymentLink(shortId: string, req?: Request): string {
  return `${getBaseUrl(req)}/pay/${shortId}`;
} 