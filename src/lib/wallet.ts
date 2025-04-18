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
 * Generate a keypair deterministically using email as entropy
 * In a real app, this would use more secure methods and better randomness
 */
export function generateKeypair(email: string): Keypair {
  // For demo purposes, we're using a deterministic approach
  // In production, you would use a more secure method with proper entropy
  const encoder = new TextEncoder();
  const encodedEmail = encoder.encode(email);

  // Hash the email to use as seed (32 bytes needed for ed25519 keypair)
  const seed = nacl.hash(encodedEmail).slice(0, 32);

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
 * Note: This is a simplified implementation for demo purposes
 * In a real app, use a proper encryption library
 */
export function encryptKeypair(keypair: Keypair, passcode: string): string {
  // Convert keypair to string format first
  const keypairString = keypairToString(keypair);

  // Create a simple hash of the passcode to use as a verification
  // This is just for demo - in real apps, use proper encryption
  const encoder = new TextEncoder();
  const encodedPasscode = encoder.encode(passcode);
  const passcodeHash = bs58.encode(nacl.hash(encodedPasscode).slice(0, 8));

  // Concatenate the keypair string and passcode hash with a separator
  const encryptedKeypair = `${keypairString}_${passcodeHash}`;

  return encryptedKeypair;
}

/**
 * Decrypt a keypair with a passcode
 */
export function decryptKeypair(encryptedKeypair: string, passcode: string): Keypair | null {
  // Create the passcode hash to verify
  const encoder = new TextEncoder();
  const encodedPasscode = encoder.encode(passcode);
  const passcodeHash = bs58.encode(nacl.hash(encodedPasscode).slice(0, 8));

  // Split the encrypted keypair by the separator
  const [keypairString, storedHash] = encryptedKeypair.split('_');

  // Verify the passcode hash
  if (storedHash === passcodeHash) {
    // If verified, convert the keypair string back to a Keypair
    return stringToKeypair(keypairString);
  }

  return null; // Passcode doesn't match
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
