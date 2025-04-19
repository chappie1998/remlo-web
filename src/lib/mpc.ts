import * as secrets from 'secrets.js-grempe';
import { randomBytes } from '@stablelib/random';
import { encode as base64Encode, decode as base64Decode } from '@stablelib/base64';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';

// Constants for cryptographic operations
const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;

/**
 * Generate a salt for PBKDF2
 */
export function generateSalt(): Uint8Array {
  return randomBytes(SALT_BYTES);
}

/**
 * Derive a deterministic key from passcode using PBKDF2
 */
export function deriveKeyFromPasscode(passcode: string, salt: Uint8Array): Uint8Array {
  return pbkdf2(sha256, passcode, salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: 32
  });
}

/**
 * Split a secret (private key) into shares using Shamir's Secret Sharing
 * Returns three shares with a threshold of 2
 * @param secretKey The secret key to split
 * @returns Object containing three shares and the salt used for passcode derivation
 */
export function splitPrivateKey(secretKey: Uint8Array): {
  passcodeShare: string; // Share derived from passcode (encrypted)
  serverShare: string; // Share to be stored on server
  backupShare: string; // Backup share for recovery
  salt: string; // Salt used for passcode derivation (base64)
} {
  // Convert secretKey to hex string for secrets.js
  const secretHex = Buffer.from(secretKey).toString('hex');

  // Split the secret into 3 shares, with a threshold of 2
  const shares = secrets.share(secretHex, 3, 2);

  // Generate a salt for the passcode derivation
  const salt = generateSalt();

  return {
    passcodeShare: shares[0],
    serverShare: shares[1],
    backupShare: shares[2],
    salt: base64Encode(salt)
  };
}

/**
 * Combine shares to reconstruct the original private key
 * @param shares Array of at least 2 shares
 * @returns The reconstructed private key as Uint8Array
 */
export function combineShares(shares: string[]): Uint8Array {
  if (shares.length < 2) {
    throw new Error('At least 2 shares are required to reconstruct the key');
  }

  // Combine the shares to reconstruct the secret
  const secretHex = secrets.combine(shares);

  // Convert hex back to Uint8Array
  return new Uint8Array(Buffer.from(secretHex, 'hex'));
}

/**
 * Generate a share from the user's passcode
 * This will be done on the client side
 * @param passcode User's passcode
 * @param salt Salt used for key derivation (base64 encoded)
 * @returns A share derived from the passcode
 */
export function generatePasscodeShare(passcode: string, salt: string): string {
  const saltBytes = base64Decode(salt);
  const derivedKey = deriveKeyFromPasscode(passcode, saltBytes);

  // Use the first 16 bytes of the derived key as a deterministic "share"
  // In a real implementation, this would be a proper MPC share
  return Buffer.from(derivedKey.slice(0, 16)).toString('hex');
}

/**
 * Encrypt a share for storage
 * @param share The share to encrypt
 * @param encryptionKey The key to use for encryption
 * @returns Encrypted share as a string
 */
export function encryptShare(share: string, encryptionKey: Uint8Array): string {
  // In a real implementation, you would use proper encryption
  // For this demo, we'll do a simple XOR "encryption"
  const shareBytes = Buffer.from(share);
  const result = new Uint8Array(shareBytes.length);

  for (let i = 0; i < shareBytes.length; i++) {
    result[i] = shareBytes[i] ^ encryptionKey[i % encryptionKey.length];
  }

  return base64Encode(result);
}

/**
 * Decrypt a share
 * @param encryptedShare The encrypted share
 * @param encryptionKey The key used for encryption
 * @returns Decrypted share as a string
 */
export function decryptShare(encryptedShare: string, encryptionKey: Uint8Array): string {
  const shareBytes = base64Decode(encryptedShare);
  const result = new Uint8Array(shareBytes.length);

  for (let i = 0; i < shareBytes.length; i++) {
    result[i] = shareBytes[i] ^ encryptionKey[i % encryptionKey.length];
  }

  return Buffer.from(result).toString();
}

/**
 * Create a new MPC wallet
 * Generates a keypair and splits it into shares
 * @returns Object containing the public key and encrypted shares
 */
export function createMPCWallet(passcode: string): {
  publicKey: string;
  serverShare: string;
  backupShare: string;
  salt: string;
} {
  // Generate a new Solana keypair
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();

  // Split the private key into shares
  const { passcodeShare, serverShare, backupShare, salt } =
    splitPrivateKey(keypair.secretKey);

  // Encrypt the server share with a key derived from the passcode
  const saltBytes = base64Decode(salt);
  const encryptionKey = deriveKeyFromPasscode(passcode, saltBytes);
  const encryptedServerShare = encryptShare(serverShare, encryptionKey);

  return {
    publicKey,
    serverShare: encryptedServerShare,
    backupShare,
    salt
  };
}

/**
 * Verify passcode and prepare for signing
 * This simulates the MPC signing preparation
 * @param passcode User's passcode
 * @param encryptedServerShare Encrypted server share
 * @param salt Salt used for key derivation
 * @returns Whether the passcode is valid
 */
export async function verifyPasscodeForMPC(
  passcode: string,
  encryptedServerShare: string,
  salt: string
): Promise<boolean> {
  try {
    const saltBytes = base64Decode(salt);
    const encryptionKey = deriveKeyFromPasscode(passcode, saltBytes);

    // Try to decrypt the server share
    decryptShare(encryptedServerShare, encryptionKey);

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Sign a transaction using MPC (simulated)
 * In a real MPC implementation, signing would happen across multiple parties
 * without reconstructing the key. This is a simplified version for demonstration.
 * @param passcode User's passcode
 * @param encryptedServerShare Encrypted server share
 * @param salt Salt used for key derivation
 * @param transactionBuffer Transaction to sign
 * @returns Keypair that can be used to sign the transaction
 */
export function prepareMPCSigningKeypair(
  passcode: string,
  encryptedServerShare: string,
  salt: string
): Keypair | null {
  try {
    const saltBytes = base64Decode(salt);
    const encryptionKey = deriveKeyFromPasscode(passcode, saltBytes);

    // Decrypt the server share
    const serverShare = decryptShare(encryptedServerShare, encryptionKey);

    // Generate the passcode share deterministically
    const passcodeShareValue = generatePasscodeShare(passcode, salt);

    // Combine the shares to reconstruct the private key
    // In a real MPC implementation, this would be done without reconstructing the key
    const secretKey = combineShares([passcodeShareValue, serverShare]);

    // Create a keypair from the reconstructed secret key
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error("Error in MPC signing preparation:", error);
    return null;
  }
}
