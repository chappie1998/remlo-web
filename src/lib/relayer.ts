import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionSignature,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { getSolanaConnection } from './solana';

// The relayer's keypair
let relayerKeypair: Keypair | null = null;

/**
 * Initialize the relayer with a private key
 */
export function initializeRelayer(privateKeyBase58: string): boolean {
  try {
    const secretKey = bs58.decode(privateKeyBase58);
    relayerKeypair = Keypair.fromSecretKey(secretKey);
    return true;
  } catch (error) {
    console.error('Error initializing relayer:', error);
    return false;
  }
}

/**
 * Get the relayer's public key
 */
export function getRelayerPublicKey(): string | null {
  if (!relayerKeypair) {
    return null;
  }
  return relayerKeypair.publicKey.toBase58();
}

/**
 * Check if the relayer is initialized
 */
export function isRelayerInitialized(): boolean {
  return relayerKeypair !== null;
}

/**
 * Get the relayer's SOL balance
 */
export async function getRelayerBalance(): Promise<{
  balanceInLamports: number;
  balanceInSol: string;
} | null> {
  if (!relayerKeypair) {
    return null;
  }

  const connection = getSolanaConnection();
  const balanceInLamports = await connection.getBalance(relayerKeypair.publicKey);
  const balanceInSol = (balanceInLamports / 1_000_000_000).toFixed(9); // LAMPORTS_PER_SOL

  return {
    balanceInLamports,
    balanceInSol,
  };
}

/**
 * Send SOL transaction using the relayer (gasless for the user)
 */
export async function sendGaslessTransaction(
  transaction: Transaction,
  userSignature: string,
  userPublicKey: string
): Promise<{ signature: string }> {
  if (!relayerKeypair) {
    throw new Error('Relayer not initialized');
  }

  try {
    const connection = getSolanaConnection();
    const userPubkey = new PublicKey(userPublicKey);

    // Deserialize the transaction
    const recoveredTransaction = Transaction.from(bs58.decode(userSignature));

    // Set the relayer as the fee payer
    recoveredTransaction.feePayer = relayerKeypair.publicKey;

    // Add compute budget instruction to prioritize the transaction if needed
    recoveredTransaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 200_000, // Adjust as needed
      })
    );

    // Get a fresh blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    recoveredTransaction.recentBlockhash = blockhash;

    // Sign with the relayer
    recoveredTransaction.partialSign(relayerKeypair);

    // Send and confirm the transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      recoveredTransaction,
      [relayerKeypair]
    );

    console.log(`Gasless transaction sent: ${signature}`);

    return { signature };
  } catch (error) {
    console.error('Error sending gasless transaction:', error);
    throw error;
  }
}

/**
 * Send an SPL token transaction using the relayer (gasless for the user)
 */
export async function sendGaslessSplTokenTransaction(
  tokenMint: string,
  fromPublicKey: string,
  toPublicKey: string,
  amount: number,
  userSignature: string,
): Promise<{ signature: string }> {
  if (!relayerKeypair) {
    throw new Error('Relayer not initialized');
  }

  try {
    const connection = getSolanaConnection();
    const fromPubkey = new PublicKey(fromPublicKey);
    const toPubkey = new PublicKey(toPublicKey);
    const mintPubkey = new PublicKey(tokenMint);

    // Get the associated token accounts for sender and receiver
    const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
    const toTokenAccount = await getAssociatedTokenAddress(mintPubkey, toPubkey);

    // Create a new transaction
    const transaction = new Transaction();

    // Check if the recipient token account exists
    try {
      await getAccount(connection, toTokenAccount);
    } catch (error) {
      // If the account doesn't exist, add instruction to create it
      transaction.add(
        createAssociatedTokenAccountInstruction(
          relayerKeypair.publicKey, // fee payer
          toTokenAccount,
          toPubkey,
          mintPubkey
        )
      );
    }

    // Add the transfer instruction
    transaction.add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromPubkey,
        amount
      )
    );

    // Add compute budget instruction
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 300_000, // Adjust as needed for token transfers
      })
    );

    // Set the relayer as the fee payer
    transaction.feePayer = relayerKeypair.publicKey;

    // Get a fresh blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    // Add the user signature
    const userSignatureBuffer = bs58.decode(userSignature);
    transaction.addSignature(fromPubkey, Buffer.from(userSignatureBuffer));

    // Sign with the relayer
    transaction.partialSign(relayerKeypair);

    // Send the transaction
    const txSignature = await connection.sendRawTransaction(transaction.serialize());

    // Wait for confirmation
    await connection.confirmTransaction(txSignature);

    console.log(`Gasless SPL token transaction sent: ${txSignature}`);

    return { signature: txSignature };
  } catch (error) {
    console.error('Error sending gasless SPL token transaction:', error);
    throw error;
  }
}

/**
 * Create a transaction for the user to sign (which will later be submitted by the relayer)
 */
export async function createUserSplTokenTransaction(
  tokenMint: string,
  fromPublicKey: string,
  toPublicKey: string,
  amount: number,
): Promise<Transaction> {
  const connection = getSolanaConnection();
  const fromPubkey = new PublicKey(fromPublicKey);
  const toPubkey = new PublicKey(toPublicKey);
  const mintPubkey = new PublicKey(tokenMint);

  // Get the associated token accounts for sender and receiver
  const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
  const toTokenAccount = await getAssociatedTokenAddress(mintPubkey, toPubkey);

  // Create a new transaction
  const transaction = new Transaction();

  // Check if the recipient token account exists
  try {
    await getAccount(connection, toTokenAccount);
  } catch (error) {
    // If the account doesn't exist, add instruction to create it
    // In a gasless flow, the relayer will handle this when sending the transaction
    transaction.add(
      createAssociatedTokenAccountInstruction(
        fromPubkey, // temporary payer, will be replaced by relayer
        toTokenAccount,
        toPubkey,
        mintPubkey
      )
    );
  }

  // Add the transfer instruction
  transaction.add(
    createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      fromPubkey,
      amount
    )
  );

  // Get a fresh blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  // Set the user as feePayer initially (will be replaced by relayer)
  transaction.feePayer = fromPubkey;

  return transaction;
}
