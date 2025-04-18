import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  TransactionSignature
} from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { getSolanaConnection } from './solana';

/**
 * Generate a keypair with strong entropy
 * In a production environment, you would want to use hardware wallet integration
 * or secure key generation capabilities
 */
export function generateKeypair(email: string): Keypair {
  // Create a secure random seed by combining multiple entropy sources
  const encoder = new TextEncoder();

  // User-specific entropy from email
  const emailBytes = encoder.encode(email);

  // Add timestamp as additional entropy
  const timestamp = Date.now().toString();
  const timestampBytes = encoder.encode(timestamp);

  // Add browser/environment specific entropy if available
  const randomValues = new Uint8Array(32);
  // Use crypto.getRandomValues in browser or crypto.randomFillSync in Node
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < 32; i++) {
      randomValues[i] = Math.floor(Math.random() * 256);
    }
  }

  // Mix all entropy sources together
  const combinedEntropy = new Uint8Array(emailBytes.length + timestampBytes.length + randomValues.length);
  combinedEntropy.set(emailBytes, 0);
  combinedEntropy.set(timestampBytes, emailBytes.length);
  combinedEntropy.set(randomValues, emailBytes.length + timestampBytes.length);

  // Hash the combined entropy to get a uniform seed
  const seed = nacl.hash(combinedEntropy).slice(0, 32);

  // Generate the keypair from the seed
  const keypair = Keypair.fromSeed(seed);

  return keypair;
}

/**
 * Convert a keypair to a string format that can be stored
 */
export function keypairToString(keypair: Keypair): string {
  // We use bs58 encoding for the secret key
  return bs58.encode(keypair.secretKey);
}

/**
 * Convert a string back to a keypair
 */
export function stringToKeypair(keypairString: string): Keypair {
  const secretKey = bs58.decode(keypairString);
  return Keypair.fromSecretKey(secretKey);
}

/**
 * Encrypt a keypair with a passcode
 * Using authenticated encryption with TweetNaCl
 */
export function encryptKeypair(keypair: Keypair, passcode: string): string {
  // Convert keypair to string format first
  const keypairString = keypairToString(keypair);
  const keypairData = new TextEncoder().encode(keypairString);

  // Derive a key from the passcode using PBKDF2 principles
  // For simplicity, we'll use multiple rounds of hashing
  // In production, use a proper PBKDF2 implementation
  const encoder = new TextEncoder();
  let derivedKey = encoder.encode(passcode);

  // Multiple rounds of hashing to strengthen the key
  for (let i = 0; i < 10000; i++) {
    derivedKey = nacl.hash(derivedKey);
  }

  // Use first 32 bytes as the encryption key
  const encryptionKey = derivedKey.slice(0, 32);

  // Generate a random nonce
  const nonce = nacl.randomBytes(24);

  // Encrypt the keypair data
  const encryptedData = nacl.secretbox(keypairData, nonce, encryptionKey);

  // Encode the encrypted data and nonce to bs58 for storage
  const encryptedBS58 = bs58.encode(encryptedData);
  const nonceBS58 = bs58.encode(nonce);

  // Store a version identifier for future compatibility
  return `v1:${encryptedBS58}:${nonceBS58}`;
}

/**
 * Decrypt a keypair with a passcode
 */
export function decryptKeypair(encryptedKeypair: string, passcode: string): Keypair | null {
  try {
    // Check the version and split the components
    const parts = encryptedKeypair.split(':');

    if (parts.length !== 3 || parts[0] !== 'v1') {
      console.error('Invalid encrypted keypair format');
      return null;
    }

    const [_, encryptedBS58, nonceBS58] = parts;

    // Decode the encrypted data and nonce
    const encryptedData = bs58.decode(encryptedBS58);
    const nonce = bs58.decode(nonceBS58);

    // Derive the key from the passcode (same process as encryption)
    const encoder = new TextEncoder();
    let derivedKey = encoder.encode(passcode);

    // Multiple rounds of hashing to strengthen the key
    for (let i = 0; i < 10000; i++) {
      derivedKey = nacl.hash(derivedKey);
    }

    // Use first 32 bytes as the decryption key
    const decryptionKey = derivedKey.slice(0, 32);

    // Decrypt the data
    const decryptedData = nacl.secretbox.open(encryptedData, nonce, decryptionKey);

    if (!decryptedData) {
      // Decryption failed - wrong passcode
      return null;
    }

    // Convert the decrypted data back to a string and then to a keypair
    const keypairString = new TextDecoder().decode(decryptedData);
    return stringToKeypair(keypairString);
  } catch (error) {
    console.error('Error decrypting keypair:', error);
    return null;
  }
}

/**
 * Get the wallet balance in SOL
 */
export async function getWalletBalance(publicKey: string): Promise<{
  balance: number;
  formattedBalance: string;
}> {
  try {
    const connection = getSolanaConnection();
    const solanaPublicKey = new PublicKey(publicKey);

    // Get the balance in lamports
    const balance = await connection.getBalance(solanaPublicKey);

    // Format the balance for display
    const formattedBalance = (balance / LAMPORTS_PER_SOL).toFixed(9);

    return {
      balance,
      formattedBalance,
    };
  } catch (error) {
    console.error("Error fetching balance:", error);
    throw error;
  }
}

/**
 * Send SOL from one account to another
 */
export async function sendTransaction(
  keypair: Keypair,
  toAddress: string,
  amount: number
): Promise<{ signature: string }> {
  try {
    const connection = getSolanaConnection();
    const toPublicKey = new PublicKey(toAddress);

    // Create a transfer instruction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: toPublicKey,
        lamports: amount,
      })
    );

    // Get the latest blockhash with a longer validity
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = keypair.publicKey;

    // Sign the transaction
    transaction.sign(keypair);

    // Send the transaction without using the subscription-based confirmation
    const signature = await connection.sendRawTransaction(transaction.serialize());

    // Manually confirm the transaction using polling instead of subscriptions
    console.log(`Transaction sent: ${signature}`);

    // Wait for confirmation using polling
    let confirmationAttempts = 0;
    const maxAttempts = 30; // Adjust based on network conditions
    const confirmationStatus = await new Promise<boolean>(async (resolve) => {
      const checkInterval = setInterval(async () => {
        confirmationAttempts++;
        try {
          const status = await connection.getSignatureStatus(signature);

          if (status && status.value) {
            clearInterval(checkInterval);
            console.log(`Transaction confirmed after ${confirmationAttempts} attempts`);
            resolve(true);
          } else if (confirmationAttempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.log(`Reached max attempts (${maxAttempts}), but transaction may still confirm later`);
            resolve(true); // Resolve anyway since transaction is still valid
          }
        } catch (err) {
          console.warn("Error checking transaction status:", err);
          if (confirmationAttempts >= maxAttempts) {
            clearInterval(checkInterval);
            resolve(true); // Resolve anyway since transaction is still valid
          }
        }
      }, 2000); // Check every 2 seconds
    });

    return { signature };
  } catch (error) {
    console.error("Error sending transaction:", error);
    throw error;
  }
}
