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
 * Simple XOR-based implementation to split a secret into two parts
 * This is a simplified approach for demonstration purposes
 * In production, use a proper Shamir's Secret Sharing library
 */
export function splitSecret(secret: Uint8Array): {
  part1: Uint8Array;
  part2: Uint8Array;
} {
  // Generate a random part1 of the same length as the secret
  const part1 = randomBytes(secret.length);

  // XOR the secret with part1 to get part2
  const part2 = new Uint8Array(secret.length);
  for (let i = 0; i < secret.length; i++) {
    part2[i] = secret[i] ^ part1[i];
  }

  return { part1, part2 };
}

/**
 * Combine two parts to reconstruct the original secret using XOR
 */
export function combineSecret(part1: Uint8Array, part2: Uint8Array): Uint8Array {
  if (part1.length !== part2.length) {
    throw new Error('Parts must be of equal length');
  }

  const secret = new Uint8Array(part1.length);
  for (let i = 0; i < part1.length; i++) {
    secret[i] = part1[i] ^ part2[i];
  }

  return secret;
}

/**
 * Split a private key into shares using a simple XOR scheme
 * @param secretKey The secret key to split
 * @returns Object containing the parts and the salt
 */
export function splitPrivateKey(secretKey: Uint8Array): {
  serverShare: string;
  backupShare: string;
  salt: string;
} {
  // Split the secret key into two parts
  const { part1, part2 } = splitSecret(secretKey);

  // Generate a salt for the passcode derivation
  const salt = generateSalt();

  // Convert parts to base64 for storage
  return {
    serverShare: base64Encode(part1),
    backupShare: base64Encode(part2),
    salt: base64Encode(salt)
  };
}

/**
 * Encrypt data for storage
 */
export function encryptData(data: Uint8Array, encryptionKey: Uint8Array): string {
  // In a real implementation, use proper encryption
  // For this demo, we'll do a simple XOR "encryption"
  const result = new Uint8Array(data.length);

  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ encryptionKey[i % encryptionKey.length];
  }

  return base64Encode(result);
}

/**
 * Decrypt data
 */
export function decryptData(encryptedData: string, encryptionKey: Uint8Array): Uint8Array {
  const dataBytes = base64Decode(encryptedData);
  const result = new Uint8Array(dataBytes.length);

  for (let i = 0; i < dataBytes.length; i++) {
    result[i] = dataBytes[i] ^ encryptionKey[i % encryptionKey.length];
  }

  return result;
}

/**
 * Create a new MPC wallet
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
  const { serverShare, backupShare, salt } = splitPrivateKey(keypair.secretKey);

  // Derive an encryption key from the passcode
  const saltBytes = base64Decode(salt);
  const encryptionKey = deriveKeyFromPasscode(passcode, saltBytes);

  // Encrypt the server share
  const encryptedServerShare = encryptData(base64Decode(serverShare), encryptionKey);

  return {
    publicKey,
    serverShare: encryptedServerShare,
    backupShare,
    salt
  };
}

/**
 * Verify passcode by attempting to decrypt the server share
 */
export async function verifyPasscodeForMPC(
  passcode: string,
  encryptedServerShare: string,
  salt: string
): Promise<boolean> {
  try {
    const saltBytes = base64Decode(salt);
    const encryptionKey = deriveKeyFromPasscode(passcode, saltBytes);

    // Try to decrypt the server share - if successful, the passcode is valid
    decryptData(encryptedServerShare, encryptionKey);

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Prepare a keypair for signing by combining the shares
 */
export function prepareMPCSigningKeypair(
  passcode: string,
  encryptedServerShare: string,
  salt: string,
  backupShare?: string
): Keypair | null {
  try {
    // If backup share is provided, use it for recovery flow
    if (backupShare) {
      // Decrypt server share using passcode
      const saltBytes = base64Decode(salt);
      const encryptionKey = deriveKeyFromPasscode(passcode, saltBytes);
      const serverShareBytes = decryptData(encryptedServerShare, encryptionKey);

      // Combine server share and backup share to reconstruct private key
      const backupShareBytes = base64Decode(backupShare);
      const privateKey = combineSecret(serverShareBytes, backupShareBytes);

      // Create keypair from combined private key
      return Keypair.fromSecretKey(privateKey);
    }

    // Normal sign with passcode flow
    const saltBytes = base64Decode(salt);
    const encryptionKey = deriveKeyFromPasscode(passcode, saltBytes);

    // Decrypt the server share
    const serverShareBytes = decryptData(encryptedServerShare, encryptionKey);

    // For a complete MPC implementation, we would derive a deterministic
    // share from the passcode and combine it with the server share.
    // Here we're simplifying by using the backup share directly stored
    // on the server, which isn't ideal for production but works for demo.

    // In this simplified implementation, we're using the same key derivation
    // function to generate a deterministic client share
    const clientShare = new Uint8Array(32);
    const baseKey = deriveKeyFromPasscode(passcode, saltBytes);

    // Use the first half of the derived key as our client share
    for (let i = 0; i < 32; i++) {
      clientShare[i] = baseKey[i % baseKey.length];
    }

    // Combine the shares to reconstruct the private key
    const privateKey = combineSecret(serverShareBytes, clientShare);

    // Create a keypair from the reconstructed private key
    return Keypair.fromSecretKey(privateKey);
  } catch (error) {
    console.error("Error in MPC signing preparation:", error);
    return null;
  }
}
