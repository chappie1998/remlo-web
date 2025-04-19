import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Constants for cryptographic operations
 */
const PBKDF2_ITERATIONS = 100000; // High iteration count for security
const SALT_BYTES = 16;
const IV_BYTES = 16;
const KEY_BYTES = 32;
const SOLANA_HD_PATH = "m/44'/501'/0'/0'"; // Standard Solana derivation path (BIP-44)

/**
 * Generate a cryptographically secure mnemonic phrase (seed phrase)
 * @param strength optional strength in bits (128, 160, 192, 224, 256)
 * @returns mnemonic phrase as a string
 */
export function generateMnemonic(strength = 256): string {
  return bip39.generateMnemonic(strength);
}

/**
 * Validate a mnemonic phrase
 * @param mnemonic the mnemonic phrase to validate
 * @returns boolean indicating if mnemonic is valid
 */
export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
}

/**
 * Derive a Solana keypair from a mnemonic phrase using HD wallet derivation
 * @param mnemonic the mnemonic phrase
 * @param derivationPath optional custom derivation path (defaults to Solana's path)
 * @returns Solana keypair
 */
export function getKeypairFromMnemonic(
  mnemonic: string,
  derivationPath = SOLANA_HD_PATH
): Keypair {
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic');
  }

  // Convert mnemonic to seed
  const seed = bip39.mnemonicToSeedSync(mnemonic);

  // Derive the ED25519 private key using the HD path
  const { key } = derivePath(derivationPath, seed.toString('hex'));

  // Create a Solana keypair from the derived key
  return Keypair.fromSeed(key);
}

/**
 * Encrypt a mnemonic phrase using the Web Crypto API with AES-GCM
 * @param mnemonic the mnemonic phrase to encrypt
 * @param passcode the passcode used for encryption
 * @returns encrypted data as a base58-encoded string
 */
export async function encryptMnemonic(mnemonic: string, passcode: string): Promise<string> {
  try {
    // Generate a random salt
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));

    // Generate a random initialization vector
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

    // Derive encryption key from passcode using PBKDF2
    const keyMaterial = pbkdf2(sha256, passcode, salt, {
      c: PBKDF2_ITERATIONS,
      dkLen: KEY_BYTES
    });

    // Import the key for use with Web Crypto API
    const key = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // Encode mnemonic to bytes
    const encoder = new TextEncoder();
    const dataToEncrypt = encoder.encode(mnemonic);

    // Encrypt the mnemonic
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      dataToEncrypt
    );

    // Combine salt, iv, and encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

    // Return as base58 string for easier storage
    return bs58.encode(combined);
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt mnemonic');
  }
}

/**
 * Decrypt a mnemonic phrase
 * @param encryptedData the encrypted mnemonic as a base58-encoded string
 * @param passcode the passcode used for decryption
 * @returns the decrypted mnemonic phrase or null if decryption fails
 */
export async function decryptMnemonic(encryptedData: string, passcode: string): Promise<string | null> {
  try {
    // Decode the base58 data
    const combined = bs58.decode(encryptedData);

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, SALT_BYTES);
    const iv = combined.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
    const encrypted = combined.slice(SALT_BYTES + IV_BYTES);

    // Derive the key from passcode using PBKDF2
    const keyMaterial = pbkdf2(sha256, passcode, salt, {
      c: PBKDF2_ITERATIONS,
      dkLen: KEY_BYTES
    });

    // Import the key for use with Web Crypto API
    const key = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encrypted
    );

    // Convert buffer to string
    const decoder = new TextDecoder();
    const decryptedMnemonic = decoder.decode(decryptedBuffer);

    // Validate that the decrypted result is a valid mnemonic
    if (!validateMnemonic(decryptedMnemonic)) {
      return null; // Not a valid mnemonic, likely wrong passcode
    }

    return decryptedMnemonic;
  } catch (error) {
    console.error('Decryption error:', error);
    return null; // Return null on any decryption error
  }
}
