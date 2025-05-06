import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
  createApproveInstruction,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { prepareMPCSigningKeypair } from './mpc';
import prisma from './prisma';
import { RELAYER_URL } from './solana';

// Configure Solana connection
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// USDC token mint address
const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT || 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');
const USDS_MINT = new PublicKey(process.env.NEXT_PUBLIC_USDS_MINT || 'DK6BeZv3ZxWXiSFUAL7s3wAiEPndBR3D4hL4jKfyXjLV');

// Token decimals
const USDC_DECIMALS = 6;
const USDS_DECIMALS = 6;

/**
 * Get keypair from user's address and passcode using MPC
 */
async function getKeypairFromPasscode(address: string, passcode: string) {
  try {
    // Find the user by their Solana address
    const user = await prisma.user.findUnique({
      where: { solanaAddress: address },
      select: {
        mpcServerShare: true,
        mpcSalt: true,
        mpcBackupShare: true,
        usesMPC: true
      }
    });

    if (!user) {
      console.error('User not found with address:', address);
      return null;
    }

    if (!user.usesMPC || !user.mpcServerShare || !user.mpcSalt) {
      console.error('User does not have MPC setup properly');
      return null;
    }

    // Prepare the keypair using MPC
    return prepareMPCSigningKeypair(
      passcode,
      user.mpcServerShare,
      user.mpcSalt,
      user.mpcBackupShare || undefined
    );
  } catch (error) {
    console.error('Error getting keypair from passcode:', error);
    return null;
  }
}

interface ApproveTokensParams {
  userAddress: string;
  amount: number;
  tokenType: string;
  delegateAddress: string;
  passcode: string;
}

interface ApproveTokensResult {
  success: boolean;
  signature?: string;
  error?: string;
}

/**
 * Approves tokens from a wallet to a delegate
 * @param params Parameters for token approval
 * @returns Result of the token approval operation
 */
export async function approveTokens(params: ApproveTokensParams): Promise<ApproveTokensResult> {
  const { userAddress, amount, tokenType, delegateAddress, passcode } = params;
  
  try {
    console.log('Starting token approval process...');
    
    // Determine which token mint to use
    const tokenMint = tokenType.toLowerCase() === 'usdc' ? USDC_MINT : USDS_MINT;
    const decimals = tokenType.toLowerCase() === 'usdc' ? USDC_DECIMALS : USDS_DECIMALS;
    
    // Convert user address to PublicKey
    const userPublicKey = new PublicKey(userAddress);
    
    // Convert delegate address to PublicKey
    const delegatePublicKey = new PublicKey(delegateAddress);
    
    // Find the token account for the wallet
    const tokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      userPublicKey
    );
    console.log(`Token Account: ${tokenAccount.toBase58()}`);
    
    // Check current token balance
    try {
      const account = await getAccount(connection, tokenAccount);
      console.log(`Current token balance: ${Number(account.amount) / 10**decimals} ${tokenType.toUpperCase()}`);
      
      // Check if user has enough balance
      if (Number(account.amount) < amount * 10**decimals) {
        return {
          success: false,
          error: `Insufficient balance. Required: ${amount} ${tokenType.toUpperCase()}, Available: ${Number(account.amount) / 10**decimals} ${tokenType.toUpperCase()}`
        };
      }
    } catch (error) {
      console.error('Error checking token account:', error);
      return {
        success: false,
        error: 'Error checking token account. Make sure you have a token account for this token.'
      };
    }
    
    // Retrieve the keypair using the passcode
    const keypair = await getKeypairFromPasscode(userPublicKey.toBase58(), passcode);
    if (!keypair) {
      return {
        success: false,
        error: 'Invalid passcode or unable to derive keypair'
      };
    }
    
    // Create the approve instruction
    const amountInLamports = amount * 10**decimals;
    console.log(`Approving ${amount} ${tokenType.toUpperCase()} (${amountInLamports} lamports) to ${delegateAddress}`);
    
    const approveTransaction = new Transaction().add(
      createApproveInstruction(
        tokenAccount,
        delegatePublicKey,
        userPublicKey,
        BigInt(amountInLamports)
      )
    );
    
    // Set recent blockhash and sign transaction
    approveTransaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    approveTransaction.feePayer = userPublicKey;
    approveTransaction.sign(keypair);
    
    // Send and confirm the transaction
    const signature = await connection.sendRawTransaction(approveTransaction.serialize());
    await connection.confirmTransaction(signature);
    
    console.log(`Approval successful! Transaction: ${signature}`);
    
    return {
      success: true,
      signature
    };
  } catch (error) {
    console.error('Error in approveTokens:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Transfers approved tokens from the original wallet to a receiver using the relayer
 * @param senderAddress Address of the original token owner
 * @param receiverAddress Address to receive the tokens
 * @param amount Amount of tokens to transfer
 * @param tokenType Type of token (usdc or usds)
 * @returns Result of the transfer operation
 */
export async function transferApprovedTokens(
  senderAddress: string,
  receiverAddress: string,
  amount: number,
  tokenType: string
): Promise<{success: boolean; signature?: string; error?: string}> {
  try {
    console.log('Starting delegation transfer through relayer API...');
    
    // The relayer URL 
    const relayerUrl = RELAYER_URL || 'http://localhost:3001';
    console.log(`Using relayer at: ${relayerUrl}`);
    
    // Convert amount to lamports with 6 decimals
    const decimals = 6;
    const amountInLamports = Math.floor(amount * (10 ** decimals));
    
    console.log(`Requesting relayer to transfer ${amount} ${tokenType.toUpperCase()} tokens that have been delegated`);
    
    // Since tokens have already been delegated to the relayer when the payment link was created,
    // we can use the transfer endpoint, but we need to specify that the relayer should use its delegation
    const transferResponse = await fetch(`${relayerUrl}/api/transfer-delegated`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: senderAddress,
        toAddress: receiverAddress,
        amount,
        amountInRawUnits: amountInLamports,
        tokenType: tokenType.toLowerCase()
      }),
    });
    
    if (!transferResponse.ok) {
      // If the transfer-delegated endpoint doesn't exist, it's a 404 error
      if (transferResponse.status === 404) {
        console.error('Relayer API error: transfer-delegated endpoint not found, falling back to standard transfer');
        
        // Fall back to the standard transfer endpoint
        return await executeStandardTransfer(
          relayerUrl, 
          senderAddress, 
          receiverAddress, 
          amount, 
          amountInLamports, 
          tokenType
        );
      }
      
      const errorData = await transferResponse.json();
      console.error('Relayer API error (transfer-delegated):', errorData);
      return {
        success: false,
        error: errorData.error || 'Failed to transfer delegated tokens via relayer'
      };
    }
    
    const transferResult = await transferResponse.json();
    console.log('Delegated transfer completed successfully:', transferResult);
    
    return {
      success: true,
      signature: transferResult.signature
    };
  } catch (error) {
    console.error('Error in transferApprovedTokens:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Fallback function for standard transfer
async function executeStandardTransfer(
  relayerUrl: string,
  senderAddress: string,
  receiverAddress: string,
  amount: number,
  amountInLamports: number,
  tokenType: string
): Promise<{success: boolean; signature?: string; error?: string}> {
  try {
    console.log('Falling back to standard transfer process...');
    
    // Create a transfer transaction using the regular transfer endpoint
    const createTransferResponse = await fetch(`${relayerUrl}/api/create-transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: senderAddress,
        toAddress: receiverAddress,
        amount,
        amountInRawUnits: amountInLamports,
        tokenType: tokenType.toLowerCase()
      }),
    });
    
    if (!createTransferResponse.ok) {
      const errorData = await createTransferResponse.json();
      console.error('Relayer API error (create-transfer):', errorData);
      return {
        success: false,
        error: errorData.error || 'Failed to create transfer via relayer'
      };
    }
    
    const createTransferResult = await createTransferResponse.json();
    console.log('Transfer transaction created:', createTransferResult);
    
    // For payment links, the user has already delegated tokens to the relayer
    // The relayer should be able to submit the transaction directly
    const submitResponse = await fetch(`${relayerUrl}/api/submit-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signedTransaction: createTransferResult.transactionData,
        useDelegate: true // Signal that the relayer should use its delegation authority
      }),
    });
    
    if (!submitResponse.ok) {
      const errorData = await submitResponse.json();
      console.error('Relayer API error (submit-transaction):', errorData);
      return {
        success: false,
        error: errorData.error || 'Failed to submit transaction via relayer'
      };
    }
    
    const submitResult = await submitResponse.json();
    console.log('Transaction submitted successfully:', submitResult);
    
    return {
      success: true,
      signature: submitResult.signature
    };
  } catch (error) {
    console.error('Error in standard transfer fallback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 