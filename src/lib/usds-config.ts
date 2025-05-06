import { PublicKey } from '@solana/web3.js';

// Program ID
export const USDS_PROGRAM_ID = new PublicKey("AqFGP1Fs3nJ3Ue2Nc7RVZ1AUAad5AsEr4VBRJB2mEnk3");

// Token addresses
export const USDC_MINT = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"); // devnet USDC
export const USDS_MINT = new PublicKey("5jMCx4W5425TPRj23KRng5nbyaZkZiD47yLXDkk5tLAV");

// Other accounts from deployment
export const CONFIG_ACCOUNT = new PublicKey("29K9NuhZ32uxLETt5Pzk5ukJrhidQwc47VzqKbzTHMFo");
export const TREASURY_PDA = new PublicKey("5faaSMxNZcBKpA1ziMGamWqPWJ1hJm3NMFF3vQ83YFkZ");
export const MINT_AUTHORITY_PDA = new PublicKey("2B8FJWXHuJTMsjDjfzsxvaszTPGRqE8nEUFW112NMuMd");
export const TREASURY_TOKEN_ACCOUNT = new PublicKey("5Zp9heu5YsSE9iDWbu55kX7pVx8Uyru4qxjudKsx1BsM");

// Calculate PDAs - only needed if we need to recalculate at runtime
export const calculateUsdsPDAs = () => {
  const [treasuryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    USDS_PROGRAM_ID
  );
  
  const [mintAuthorityPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint-authority")],
    USDS_PROGRAM_ID
  );
  
  return { treasuryPDA, mintAuthorityPDA };
};

// Instruction discriminators from IDL
export const SWAP_DISCRIMINATORS = {
  swapUsdcToUsds: new Uint8Array([3, 47, 72, 28, 13, 138, 47, 210]),
  swapUsdsToUsdc: new Uint8Array([254, 45, 112, 36, 49, 103, 151, 48])
};

// Helper to encode u64 amounts for instruction data
export function encodeU64(value: number): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value), 0);
  return buffer;
} 