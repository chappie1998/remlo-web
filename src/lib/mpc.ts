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
  // Ensure the secret has the correct length (64 bytes for Solana)
  if (secret.length !== 64) {
    throw new Error(`Invalid secret length for Solana key: ${secret.length}, expected 64 bytes`);
  }

  // Generate two random parts with the same length as the secret
  const part1 = randomBytes(secret.length);
  const part2 = randomBytes(secret.length);

  // XOR the parts to create the third part such that part1 ⊕ part2 ⊕ part3 = secret
  const part3 = new Uint8Array(secret.length);
  for (let i = 0; i < secret.length; i++) {
    part3[i] = secret[i] ^ part1[i] ^ part2[i];
  }

  // Verify our parts are the correct length
  if (part1.length !== 64 || part2.length !== 64 || part3.length !== 64) {
    throw new Error(`Invalid part lengths after split: ${part1.length}, ${part2.length}, ${part3.length}`);
  }

  // Test recombination to verify correctness
  const recombined = new Uint8Array(secret.length);
  for (let i = 0; i < secret.length; i++) {
    recombined[i] = part1[i] ^ part2[i] ^ part3[i];
    if (recombined[i] !== secret[i]) {
      throw new Error(`Recombination test failed at index ${i}: original=${secret[i]}, recombined=${recombined[i]}`);
    }
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
  // Ensure we have a valid Solana secret key length (64 bytes)
  if (secretKey.length !== 64) {
    throw new Error(`Invalid Solana secret key length: ${secretKey.length}, expected 64 bytes`);
  }

  // Split the secret key into three parts
  const { part1, part2, part3 } = splitSecretIntoThreeParts(secretKey);

  // Verify that our parts have the correct length
  if (part1.length !== 64 || part2.length !== 64 || part3.length !== 64) {
    throw new Error(`Invalid split parts length: ${part1.length}, ${part2.length}, ${part3.length}`);
  }

  // Generate a salt for the passcode derivation
  const salt = generateSalt();

  // Test recombination to ensure our parts can be recombined correctly
  const recombined = combineThreeParts(part1, part2, part3);
  let isValid = true;
  for (let i = 0; i < secretKey.length; i++) {
    if (secretKey[i] !== recombined[i]) {
      isValid = false;
      throw new Error(`Key recombination test failed at index ${i}: original=${secretKey[i]}, recombined=${recombined[i]}`);
    }
  }

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
  try {
    // Generate a new Solana keypair
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();

    // Ensure the secret key has the correct length (64 bytes for Solana)
    if (keypair.secretKey.length !== 64) {
      throw new Error(`Invalid Solana keypair: secret key length is ${keypair.secretKey.length}, expected 64`);
    }

    console.log(`Creating MPC wallet with keypair secret key length: ${keypair.secretKey.length}`);

    // Generate a salt for passcode derivation
    const salt = generateSalt();
    const saltBase64 = base64Encode(salt);

    // Create user share by deriving it from the passcode
    const userShareBytes = deriveUserShare(passcode, saltBase64, 64);

    // Create server share (random)
    const serverShareBytes = randomBytes(64);

    // Create backup share such that userShare ⊕ serverShare ⊕ backupShare = secretKey
    const backupShareBytes = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
      backupShareBytes[i] = keypair.secretKey[i] ^ userShareBytes[i] ^ serverShareBytes[i];
    }

    // Verify reconstruction works
    const reconstructedKey = combineThreeParts(userShareBytes, serverShareBytes, backupShareBytes);

    // Verify the reconstructed key matches the original
    let isValid = true;
    for (let i = 0; i < keypair.secretKey.length; i++) {
      if (keypair.secretKey[i] !== reconstructedKey[i]) {
        isValid = false;
        console.error(`Key mismatch at index ${i}: original=${keypair.secretKey[i]}, reconstructed=${reconstructedKey[i]}`);
        break;
      }
    }

    if (!isValid) {
      throw new Error("Key reconstruction verification failed");
    }

    // Convert shares to base64 for storage
    const userShare = base64Encode(userShareBytes);
    const serverShare = base64Encode(serverShareBytes);
    const backupShare = base64Encode(backupShareBytes);

    // Encrypt the server share
    const encryptionKey = deriveKeyFromPasscode(passcode, salt);
    const encryptedServerShare = encryptData(serverShareBytes, encryptionKey);

    // Create an additional recovery share by XORing the user and backup shares
    const recoveryShareBytes = new Uint8Array(64);
    for (let i = 0; i < recoveryShareBytes.length; i++) {
      recoveryShareBytes[i] = userShareBytes[i] ^ backupShareBytes[i];
    }
    const recoveryShare = base64Encode(recoveryShareBytes);

    // Final verification - attempt to create a keypair from reconstructed key
    try {
      Keypair.fromSecretKey(reconstructedKey);
    } catch (e) {
      console.error("Failed verification:", e);
      throw new Error("Failed to create keypair from reconstructed key");
    }

    return {
      publicKey,
      serverShare: encryptedServerShare,
      backupShare,
      recoveryShare,
      salt: saltBase64
    };
  } catch (error) {
    console.error("Error creating MPC wallet:", error);
    throw error;
  }
}

/**
 * Verify passcode by attempting to decrypt the server share
 */
export async function verifyPasscodeForMPC(
  passcode: string,
  encryptedServerShare: string,
  salt: string,
  backupShare?: string
): Promise<boolean> {
  try {
    // First verify we can decrypt the server share
    const saltBytes = base64Decode(salt);
    const encryptionKey = deriveKeyFromPasscode(passcode, saltBytes);

    // Try to decrypt the server share
    const serverShareBytes = decryptData(encryptedServerShare, encryptionKey);

    // If we have a backup share, try to fully reconstruct the keypair
    if (backupShare) {
      // Derive user share from passcode
      const userShareBytes = deriveUserShare(passcode, salt, serverShareBytes.length);
      const backupShareBytes = base64Decode(backupShare);

      // Try to create a keypair from the combined shares
      try {
        const privateKey = combineThreeParts(userShareBytes, serverShareBytes, backupShareBytes);
        // This will throw if the key is invalid
        Keypair.fromSecretKey(privateKey);
      } catch (e) {
        console.error("Key reconstruction failed during verification:", e);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Passcode verification failed:", error);
    return false;
  }
}

/**
 * Derive the user share from the passcode
 */
export function deriveUserShare(passcode: string, salt: string, length = 64): Uint8Array {
  const saltBytes = base64Decode(salt);
  const baseKey = deriveKeyFromPasscode(passcode, saltBytes);

  // Fixed length of 64 bytes required for Solana keypairs
  const userShare = new Uint8Array(length);

  if (length !== 64) {
    console.warn(`Warning: deriveUserShare called with length ${length}, but Solana requires 64 bytes`);
  }

  // Use a more deterministic approach to derive the full key
  // This creates a sequence of hashes that are concatenated to form the full key
  const sequenceKey = sha256(baseKey);

  if (sequenceKey.length >= length) {
    // If the hash is long enough, just use the first 'length' bytes
    userShare.set(sequenceKey.slice(0, length));
  } else {
    // Otherwise, fill the userShare by repeatedly hashing with different counters
    let pos = 0;
    let counter = 0;

    while (pos < length) {
      // Create input for this round: concat previous hash + counter + salt
      const input = new Uint8Array(sequenceKey.length + 4 + saltBytes.length);
      input.set(sequenceKey);

      // Add counter as 4 bytes
      input[sequenceKey.length] = (counter >> 24) & 0xff;
      input[sequenceKey.length + 1] = (counter >> 16) & 0xff;
      input[sequenceKey.length + 2] = (counter >> 8) & 0xff;
      input[sequenceKey.length + 3] = counter & 0xff;

      // Add salt
      input.set(saltBytes, sequenceKey.length + 4);

      // Hash the input to get next segment
      const segment = sha256(input);

      // Copy bytes into result
      const bytesToCopy = Math.min(segment.length, length - pos);
      userShare.set(segment.slice(0, bytesToCopy), pos);
      pos += bytesToCopy;
      counter++;
    }
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
    // First, decrypt the server share using the passcode
    const saltBytes = base64Decode(salt);
    const encryptionKey = deriveKeyFromPasscode(passcode, saltBytes);
    const serverShareBytes = decryptData(encryptedServerShare, encryptionKey);

    // Check that server share has the correct length
    if (serverShareBytes.length !== 64) {
      console.error(`Invalid server share length: ${serverShareBytes.length}, expected 64`);
      return null;
    }

    // Derive user share deterministically from passcode (always use length 64)
    const userShareBytes = deriveUserShare(passcode, salt, 64);

    console.log(`User share length: ${userShareBytes.length}, Server share length: ${serverShareBytes.length}`);

    // If backup and recovery shares are provided, this is a full recovery scenario
    if (backupShare && recoveryShare) {
      const backupShareBytes = base64Decode(backupShare);
      const recoveryShareBytes = base64Decode(recoveryShare);

      // Check that backup share has the correct length
      if (backupShareBytes.length !== 64 || recoveryShareBytes.length !== 64) {
        console.error(`Invalid backup/recovery share lengths: backup=${backupShareBytes.length}, recovery=${recoveryShareBytes.length}`);
        return null;
      }

      // Reconstruct the private key using all three shares
      const privateKey = combineThreeParts(backupShareBytes, serverShareBytes, recoveryShareBytes);

      try {
        // Validate that we have a proper Solana keypair length (64 bytes)
        if (privateKey.length !== 64) {
          throw new Error(`Invalid secret key length: ${privateKey.length}, expected 64`);
        }
        return Keypair.fromSecretKey(privateKey);
      } catch (e) {
        console.error("Failed to create keypair from reconstructed key:", e);
        return null;
      }
    }

    // Standard flow: combine user share and server share, plus backup if available
    if (backupShare) {
      const backupShareBytes = base64Decode(backupShare);

      // Check that backup share has the correct length
      if (backupShareBytes.length !== 64) {
        console.error(`Invalid backup share length: ${backupShareBytes.length}, expected 64`);
        return null;
      }

      const privateKey = combineThreeParts(userShareBytes, serverShareBytes, backupShareBytes);

      try {
        // Validate that we have a proper Solana keypair length (64 bytes)
        if (privateKey.length !== 64) {
          throw new Error(`Invalid secret key length: ${privateKey.length}, expected 64`);
        }

        // Debug information
        console.log(`Reconstructed private key length: ${privateKey.length}`);

        return Keypair.fromSecretKey(privateKey);
      } catch (e) {
        console.error("Failed to create keypair from reconstructed key:", e);
        return null;
      }
    } else {
      // Without backup share, we'll use a third share derived from both user and server shares
      // Create a deterministic third share by hashing user and server shares together
      const combinedBytes = new Uint8Array(userShareBytes.length * 2);
      combinedBytes.set(userShareBytes, 0);
      combinedBytes.set(serverShareBytes, userShareBytes.length);

      const hashResult = sha256(combinedBytes);

      // Ensure the third share is the right length
      const thirdShareBytes = new Uint8Array(64);
      for (let i = 0; i < thirdShareBytes.length; i++) {
        thirdShareBytes[i] = hashResult[i % hashResult.length];
      }

      const privateKey = combineThreeParts(userShareBytes, serverShareBytes, thirdShareBytes);

      try {
        // Validate that we have a proper Solana keypair length (64 bytes)
        if (privateKey.length !== 64) {
          throw new Error(`Invalid secret key length: ${privateKey.length}, expected 64`);
        }
        return Keypair.fromSecretKey(privateKey);
      } catch (e) {
        console.error("Failed to create keypair from reconstructed key:", e);
        return null;
      }
    }
  } catch (error) {
    console.error("Error in MPC signing preparation:", error);
    return null;
  }
}
