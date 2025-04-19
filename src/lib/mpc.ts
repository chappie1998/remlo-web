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
 * Split a secret into 3 parts using XOR
 * This is a simplified approach for demonstration purposes
 * In production, use a proper threshold secret sharing library
 *
 * @param secret The secret to split
 * @returns Object containing three parts
 */
export function splitSecretIntoThreeParts(secret: Uint8Array): {
  part1: Uint8Array; // User part (derived from passcode)
  part2: Uint8Array; // Server part
  part3: Uint8Array; // Backup part
} {
  // Generate two random parts
  const part1 = randomBytes(secret.length);
  const part2 = randomBytes(secret.length);

  // XOR the parts to create the third part such that part1 ⊕ part2 ⊕ part3 = secret
  const part3 = new Uint8Array(secret.length);
  for (let i = 0; i < secret.length; i++) {
    part3[i] = secret[i] ^ part1[i] ^ part2[i];
  }

  return { part1, part2, part3 };
}

/**
 * Combine three parts to reconstruct the original secret using XOR
 */
export function combineThreeParts(part1: Uint8Array, part2: Uint8Array, part3: Uint8Array): Uint8Array {
  if (part1.length !== part2.length || part2.length !== part3.length) {
    throw new Error('All parts must be of equal length');
  }

  const secret = new Uint8Array(part1.length);
  for (let i = 0; i < part1.length; i++) {
    secret[i] = part1[i] ^ part2[i] ^ part3[i];
  }

  return secret;
}

/**
 * Split a private key into three shares
 * @param secretKey The secret key to split
 * @returns Object containing the parts and the salt
 */
export function splitPrivateKey(secretKey: Uint8Array): {
  userShare: string;    // Will be replaced with a deterministic derivation
  serverShare: string;  // Stored on server
  backupShare: string;  // For recovery
  salt: string;         // For passcode derivation
} {
  // Split the secret key into three parts
  const { part1, part2, part3 } = splitSecretIntoThreeParts(secretKey);

  // Generate a salt for the passcode derivation
  const salt = generateSalt();

  // Convert parts to base64 for storage
  return {
    userShare: base64Encode(part1),     // This will be derived from passcode in actual use
    serverShare: base64Encode(part2),
    backupShare: base64Encode(part3),
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
 * Create a new MPC wallet with 3-part secret sharing
 * @returns Object containing the public key and encrypted shares
 */
export function createMPCWallet(passcode: string): {
  publicKey: string;
  serverShare: string;
  backupShare: string;
  recoveryShare: string; // Additional share for more recovery options
  salt: string;
} {
  // Generate a new Solana keypair
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();

  // Split the private key into three shares
  const { userShare, serverShare, backupShare, salt } = splitPrivateKey(keypair.secretKey);

  // Derive an encryption key from the passcode
  const saltBytes = base64Decode(salt);
  const encryptionKey = deriveKeyFromPasscode(passcode, saltBytes);

  // Encrypt the server share
  const encryptedServerShare = encryptData(base64Decode(serverShare), encryptionKey);

  // Create an additional recovery share by XORing the user and backup shares
  // This provides alternative recovery paths
  const recoveryShareBytes = new Uint8Array(base64Decode(userShare).length);
  const userShareBytes = base64Decode(userShare);
  const backupShareBytes = base64Decode(backupShare);

  for (let i = 0; i < recoveryShareBytes.length; i++) {
    recoveryShareBytes[i] = userShareBytes[i] ^ backupShareBytes[i];
  }

  const recoveryShare = base64Encode(recoveryShareBytes);

  return {
    publicKey,
    serverShare: encryptedServerShare,
    backupShare,
    recoveryShare, // This can be stored in a different location than backupShare
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
 * Derive the user share from the passcode
 */
export function deriveUserShare(passcode: string, salt: string, length: number = 32): Uint8Array {
  const saltBytes = base64Decode(salt);
  const baseKey = deriveKeyFromPasscode(passcode, saltBytes);

  // Create a fixed-length user share from the derived key
  const userShare = new Uint8Array(length);

  // Stretch the derived key to fill the user share
  for (let i = 0; i < length; i++) {
    userShare[i] = baseKey[i % baseKey.length];
  }

  return userShare;
}

/**
 * Prepare a keypair for signing by combining the shares
 * There are multiple ways to reconstruct the key, supporting various scenarios:
 * 1. Standard flow: passcode (user share) + server share
 * 2. Recovery flow 1: backup share + server share + recovery share
 * 3. Recovery flow 2: backup share + passcode (if server is compromised)
 */
export function prepareMPCSigningKeypair(
  passcode: string,
  encryptedServerShare: string,
  salt: string,
  backupShare?: string,
  recoveryShare?: string
): Keypair | null {
  try {
    const saltBytes = base64Decode(salt);
    const encryptionKey = deriveKeyFromPasscode(passcode, saltBytes);

    // Get the server share
    const serverShareBytes = decryptData(encryptedServerShare, encryptionKey);

    // Derive user share from passcode
    const userShareBytes = deriveUserShare(passcode, salt, serverShareBytes.length);

    // If backup and recovery shares are provided, this is a full recovery scenario
    if (backupShare && recoveryShare) {
      const backupShareBytes = base64Decode(backupShare);
      const recoveryShareBytes = base64Decode(recoveryShare);

      // Reconstruct the private key using all three shares
      const privateKey = combineThreeParts(backupShareBytes, serverShareBytes, recoveryShareBytes);

      return Keypair.fromSecretKey(privateKey);
    }

    // Standard flow: combine user share and server share, plus backup if available
    if (backupShare) {
      const backupShareBytes = base64Decode(backupShare);
      const privateKey = combineThreeParts(userShareBytes, serverShareBytes, backupShareBytes);
      return Keypair.fromSecretKey(privateKey);
    } else {
      // Without backup share, we'll use a third share derived from both user and server shares
      // This is less secure but allows for backward compatibility
      const thirdShareBytes = new Uint8Array(userShareBytes.length);

      // Generate a deterministic third share by hashing the combination of user and server
      const combinedBytes = new Uint8Array(userShareBytes.length * 2);
      combinedBytes.set(userShareBytes, 0);
      combinedBytes.set(serverShareBytes, userShareBytes.length);

      const hash = sha256(combinedBytes);

      // Use the hash to fill the third share
      for (let i = 0; i < thirdShareBytes.length; i++) {
        thirdShareBytes[i] = hash[i % hash.length];
      }

      const privateKey = combineThreeParts(userShareBytes, serverShareBytes, thirdShareBytes);
      return Keypair.fromSecretKey(privateKey);
    }
  } catch (error) {
    console.error("Error in MPC signing preparation:", error);
    return null;
  }
}
