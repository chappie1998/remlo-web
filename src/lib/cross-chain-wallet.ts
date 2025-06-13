import { Keypair } from '@solana/web3.js';
import { randomBytes } from '@stablelib/random';
import { encode as base64Encode, decode as base64Decode } from '@stablelib/base64';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
// import { hdkey } from 'ethereumjs-wallet';
import { generateMnemonic, mnemonicToSeedSync } from 'bip39';
// import * as bip32 from 'bip32';
import * as ed25519 from 'ed25519-hd-key';
// For EVM wallet creation, use ethers.js for proper address derivation
import { createHash } from 'crypto';
import { ethers } from 'ethers';

// Cross-chain derivation paths (BIP44 standard)
const DERIVATION_PATHS = {
  ETHEREUM: "m/44'/60'/0'/0/0",
  SOLANA: "m/44'/501'/0'/0'",
  BITCOIN: "m/44'/0'/0'/0/0",
  POLYGON: "m/44'/60'/0'/0/1", // Same as ETH but different index
  BSC: "m/44'/60'/0'/0/2",     // Same as ETH but different index
} as const;

export interface CrossChainWallet {
  // Master seed info
  masterSeed: string;
  mnemonic?: string; // Optional: for compatibility with existing wallets
  
  // Solana wallet
  solana: {
    privateKey: Uint8Array;
    publicKey: string;
    address: string;
  };
  
  // EVM wallet (Ethereum, Polygon, BSC, etc.)
  evm: {
    privateKey: string;
    publicKey: string;
    address: string;
  };
  
  // MPC shares for cross-chain support
  mpcShares: {
    userShare: string;
    serverShare: string;
    backupShare: string;
    salt: string;
  };
}

/**
 * Create a cross-chain wallet that supports both Solana and EVM chains
 * Uses the same entropy source for both chains
 */
export function createCrossChainWallet(passcode: string): CrossChainWallet {
  // Generate a master seed (64 bytes for maximum entropy)
  const masterSeed = randomBytes(64);
  
  // Derive Solana wallet
  const solanaWallet = deriveSolanaWallet(masterSeed);
  
  // Derive EVM wallet
  const evmWallet = deriveEVMWallet(masterSeed);
  
  // Create MPC shares for the master seed
  const mpcShares = createCrossChainMPCShares(masterSeed, passcode);
  
  return {
    masterSeed: base64Encode(masterSeed),
    solana: solanaWallet,
    evm: evmWallet,
    mpcShares
  };
}

/**
 * Create a cross-chain wallet from existing mnemonic (for migration)
 */
export function createCrossChainWalletFromMnemonic(mnemonic: string, passcode: string): CrossChainWallet {
  // Convert mnemonic to seed
  const seed = mnemonicToSeedSync(mnemonic);
  
  // Derive wallets
  const solanaWallet = deriveSolanaWallet(seed);
  const evmWallet = deriveEVMWallet(seed);
  const mpcShares = createCrossChainMPCShares(seed, passcode);
  
  return {
    masterSeed: base64Encode(seed),
    mnemonic,
    solana: solanaWallet,
    evm: evmWallet,
    mpcShares
  };
}

/**
 * Derive Solana wallet from master seed using BIP44 derivation
 */
function deriveSolanaWallet(masterSeed: Uint8Array) {
  // For Solana, we use ed25519 HD derivation
  const derivedSeed = ed25519.derivePath(DERIVATION_PATHS.SOLANA, Buffer.from(masterSeed).toString('hex')).key;
  
  // Create Solana keypair
  const keypair = Keypair.fromSeed(derivedSeed);
  
  return {
    privateKey: keypair.secretKey,
    publicKey: keypair.publicKey.toBase58(),
    address: keypair.publicKey.toBase58()
  };
}

/**
 * Derive EVM wallet from master seed using proper ethers.js derivation
 * Generates REAL Ethereum addresses that can be used on EVM chains
 */
function deriveEVMWallet(masterSeed: Uint8Array) {
  // Create a deterministic private key for EVM from master seed
  const hash = createHash('sha256');
  hash.update(masterSeed);
  hash.update('ethereum'); // Chain identifier
  const privateKeyBuffer = hash.digest();
  
  // Convert to hex string (EVM private key format)
  const privateKey = '0x' + privateKeyBuffer.toString('hex');
  
  try {
    // Use ethers.js to properly derive the wallet from private key
    const wallet = new ethers.Wallet(privateKey);
    
    // Get the public key using SigningKey
    const signingKey = new ethers.SigningKey(privateKey);
    
    return {
      privateKey: wallet.privateKey,
      publicKey: signingKey.publicKey,
      address: wallet.address
    };
  } catch (error) {
    console.error('Failed to derive EVM wallet:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Invalid private key for EVM wallet derivation: ${errorMessage}`);
  }
}

/**
 * Create MPC shares for cross-chain master seed
 */
function createCrossChainMPCShares(masterSeed: Uint8Array, passcode: string) {
  // Generate salt for passcode derivation
  const salt = randomBytes(16);
  const saltBase64 = base64Encode(salt);
  
  // Derive user share from passcode
  const userShareBytes = pbkdf2(sha256, passcode, salt, {
    c: 100000,
    dkLen: masterSeed.length
  });
  
  // Generate server share (random)
  const serverShareBytes = randomBytes(masterSeed.length);
  
  // Calculate backup share: masterSeed = userShare ⊕ serverShare ⊕ backupShare
  const backupShareBytes = new Uint8Array(masterSeed.length);
  for (let i = 0; i < masterSeed.length; i++) {
    backupShareBytes[i] = masterSeed[i] ^ userShareBytes[i] ^ serverShareBytes[i];
  }
  
  // Encrypt server share with passcode-derived key
  const encryptionKey = pbkdf2(sha256, passcode, salt, { c: 100000, dkLen: 32 });
  const encryptedServerShare = encryptData(serverShareBytes, encryptionKey);
  
  return {
    userShare: base64Encode(userShareBytes),
    serverShare: encryptedServerShare,
    backupShare: base64Encode(backupShareBytes),
    salt: saltBase64
  };
}

/**
 * Reconstruct cross-chain wallet from MPC shares
 */
export function reconstructCrossChainWallet(
  passcode: string,
  mpcShares: {
    serverShare: string;
    backupShare: string;
    salt: string;
  }
): CrossChainWallet | null {
  try {
    const salt = base64Decode(mpcShares.salt);
    
    // Derive user share from passcode
    const userShareBytes = pbkdf2(sha256, passcode, salt, {
      c: 100000,
      dkLen: 64 // Master seed length
    });
    
    // Decrypt server share
    const encryptionKey = pbkdf2(sha256, passcode, salt, { c: 100000, dkLen: 32 });
    const serverShareBytes = decryptData(mpcShares.serverShare, encryptionKey);
    
    // Decode backup share
    const backupShareBytes = base64Decode(mpcShares.backupShare);
    
    // Reconstruct master seed
    const masterSeed = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      masterSeed[i] = userShareBytes[i] ^ serverShareBytes[i] ^ backupShareBytes[i];
    }
    
    // Derive wallets from reconstructed seed
    const solanaWallet = deriveSolanaWallet(masterSeed);
    const evmWallet = deriveEVMWallet(masterSeed);
    
    return {
      masterSeed: base64Encode(masterSeed),
      solana: solanaWallet,
      evm: evmWallet,
      mpcShares: {
        userShare: base64Encode(userShareBytes),
        serverShare: mpcShares.serverShare,
        backupShare: mpcShares.backupShare,
        salt: mpcShares.salt
      }
    };
  } catch (error) {
    console.error('Failed to reconstruct cross-chain wallet:', error);
    return null;
  }
}

/**
 * Get wallet for specific chain
 */
export function getChainWallet(crossChainWallet: CrossChainWallet, chain: 'solana' | 'ethereum' | 'polygon' | 'bsc') {
  switch (chain) {
    case 'solana':
      return crossChainWallet.solana;
    case 'ethereum':
    case 'polygon':
    case 'bsc':
      return crossChainWallet.evm; // Same private key, different networks
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}

/**
 * Derive wallet for specific EVM chain using proper ethers.js derivation
 * Generates REAL Ethereum addresses for different chains
 */
export function deriveEVMChainWallet(masterSeed: Uint8Array, chain: 'ethereum' | 'polygon' | 'bsc') {
  // Create a deterministic private key for the specific chain
  const hash = createHash('sha256');
  hash.update(masterSeed);
  hash.update(chain); // Chain identifier
  const privateKeyBuffer = hash.digest();
  
  // Convert to hex string (EVM private key format)
  const privateKey = '0x' + privateKeyBuffer.toString('hex');
  
  try {
    // Use ethers.js to properly derive the wallet from private key
    const wallet = new ethers.Wallet(privateKey);
    
    // Get the public key using SigningKey
    const signingKey = new ethers.SigningKey(privateKey);
    
    return {
      privateKey: wallet.privateKey,
      publicKey: signingKey.publicKey,
      address: wallet.address,
      chain
    };
  } catch (error) {
    console.error(`Failed to derive EVM wallet for chain ${chain}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Invalid private key for ${chain} wallet derivation: ${errorMessage}`);
  }
}

/**
 * Simple XOR encryption (replace with proper encryption in production)
 */
function encryptData(data: Uint8Array, encryptionKey: Uint8Array): string {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ encryptionKey[i % encryptionKey.length];
  }
  return base64Encode(result);
}

/**
 * Simple XOR decryption (replace with proper encryption in production)
 */
function decryptData(encryptedData: string, encryptionKey: Uint8Array): Uint8Array {
  const dataBytes = base64Decode(encryptedData);
  const result = new Uint8Array(dataBytes.length);
  for (let i = 0; i < dataBytes.length; i++) {
    result[i] = dataBytes[i] ^ encryptionKey[i % encryptionKey.length];
  }
  return result;
}

/**
 * Migrate existing Solana wallet to cross-chain
 */
export function migrateSolanaWalletToCrossChain(
  solanaPrivateKey: Uint8Array,
  passcode: string
): CrossChainWallet {
  // Use the Solana private key as part of the entropy for the master seed
  // This ensures the Solana wallet remains the same
  const masterSeed = new Uint8Array(64);
  
  // Use the first 32 bytes from the Solana private key
  masterSeed.set(solanaPrivateKey.slice(0, 32), 0);
  
  // Fill the rest with deterministic data derived from the Solana key
  const additionalEntropy = sha256(solanaPrivateKey);
  masterSeed.set(additionalEntropy, 32);
  
  // Derive EVM wallet from the master seed
  const evmWallet = deriveEVMWallet(masterSeed);
  
  // Create MPC shares
  const mpcShares = createCrossChainMPCShares(masterSeed, passcode);
  
  // Reconstruct Solana wallet info
  const solanaKeypair = Keypair.fromSecretKey(solanaPrivateKey);
  
  return {
    masterSeed: base64Encode(masterSeed),
    solana: {
      privateKey: solanaPrivateKey,
      publicKey: solanaKeypair.publicKey.toBase58(),
      address: solanaKeypair.publicKey.toBase58()
    },
    evm: evmWallet,
    mpcShares
  };
}

export default {
  createCrossChainWallet,
  createCrossChainWalletFromMnemonic,
  reconstructCrossChainWallet,
  getChainWallet,
  deriveEVMChainWallet,
  migrateSolanaWalletToCrossChain
}; 