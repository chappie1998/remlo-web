import { NextRequest, NextResponse } from "next/server";
import { PublicKey, Transaction } from "@solana/web3.js";
import prisma from "@/lib/prisma";
import { Keypair } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { getSolanaConnection } from "@/lib/solana";
import {
  USDS_PROGRAM_ID,
  CONFIG_ACCOUNT,
  TREASURY_PDA,
  TREASURY_TOKEN_ACCOUNT,
  MINT_AUTHORITY_PDA,
  USDS_MINT,
  SWAP_DISCRIMINATORS,
} from "@/lib/usds-config";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import nacl from "tweetnacl";
import bs58 from "bs58";

// For encoding U64 values
function encodeU64(value: number): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value), 0);
  return buffer;
}

// Function to decrypt private key
function decryptPrivateKey(encryptedPrivateKey: string, passcode: string): Uint8Array {
  // Simple decryption for demonstration - in this simplified example we're using 
  // the same approach as shown in the examples we found in the codebase
  const [keypairString, storedHash] = encryptedPrivateKey.split('_');
  
  // Create the passcode hash to verify
  const encoder = new TextEncoder();
  const encodedPasscode = encoder.encode(passcode);
  const passcodeHash = bs58.encode(nacl.hash(encodedPasscode).slice(0, 8));
  
  // Verify the passcode hash
  if (storedHash === passcodeHash) {
    // If verified, convert the keypair string back to a secret key
    return bs58.decode(keypairString);
  }
  
  throw new Error("Invalid passcode");
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// Add a constant for common headers to use in all responses
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
};

export async function POST(req: NextRequest) {
  try {
    console.log('Handling mobile swap request');
    
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    console.log('Authorization header:', authHeader);
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: "Authorization header missing or invalid" },
        { 
          status: 401,
          headers: CORS_HEADERS
        }
      );
    }
    
    // Extract the token
    const token = authHeader.substring(7);
    
    // Find the session in the database directly
    const dbSession = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: { user: true }
    });
    
    console.log('Database session lookup result:', dbSession ? 'Found' : 'Not found');
    
    if (!dbSession?.user || dbSession.expires <= new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired session token" },
        { 
          status: 401,
          headers: CORS_HEADERS
        }
      );
    }
    
    // User is authenticated, proceed with swap
    const user = dbSession.user;
    console.log('Authenticated user:', user.email);
    
    // Get request data
    const { amount, passcode, fromToken, toToken } = await req.json();
    
    // Validate inputs
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { 
          status: 400,
          headers: CORS_HEADERS
        }
      );
    }
    
    if (!passcode || passcode.length !== 6) {
      return NextResponse.json(
        { error: "Invalid passcode" },
        { 
          status: 400,
          headers: CORS_HEADERS
        }
      );
    }
    
    if (!fromToken || !toToken) {
      return NextResponse.json(
        { error: "Both fromToken and toToken are required" },
        { 
          status: 400,
          headers: CORS_HEADERS
        }
      );
    }
    
    // Standardize token types
    const fromTokenLower = fromToken.toLowerCase();
    const toTokenLower = toToken.toLowerCase();
    
    if (!["usdc", "usds"].includes(fromTokenLower) || !["usdc", "usds"].includes(toTokenLower)) {
      return NextResponse.json(
        { error: "Invalid token types. Supported types: usdc, usds" },
        { 
          status: 400,
          headers: CORS_HEADERS
        }
      );
    }
    
    if (fromTokenLower === toTokenLower) {
      return NextResponse.json(
        { error: "Cannot swap to the same token type" },
        { 
          status: 400,
          headers: CORS_HEADERS
        }
      );
    }
    
    // Verify user has valid passcode and wallet
    if (!user.passcodeHash) {
      return NextResponse.json(
        { error: "User passcode not set up" },
        { 
          status: 400,
          headers: CORS_HEADERS
        }
      );
    }
    
    // The User model contains the encryptedKeypair field directly
    if (!user.encryptedKeypair) {
      return NextResponse.json(
        { error: "User wallet not set up" },
        { 
          status: 400,
          headers: CORS_HEADERS
        }
      );
    }
    
    // Verify passcode
    const crypto = require('crypto');
    
    // Get the passcode hash from the user model directly
    const hashedPasscode = crypto
      .createHash('sha256')
      .update(`${passcode}${user.mpcSalt || ''}`)
      .digest('hex');
    
    if (hashedPasscode !== user.passcodeHash) {
      return NextResponse.json(
        { error: "Invalid passcode" },
        { 
          status: 401,
          headers: CORS_HEADERS
        }
      );
    }
    
    // Decrypt private key
    try {
      const privateKeyBytes = decryptPrivateKey(
        user.encryptedKeypair,
        passcode
      );
      
      const keypair = Keypair.fromSecretKey(privateKeyBytes);
      console.log(`User public key: ${keypair.publicKey.toString()}`);
      
      if (keypair.publicKey.toString() !== user.solanaAddress) {
        throw new Error("Decrypted wallet address does not match stored address");
      }
      
      // Create a record of the swap transaction request
      const transaction = await prisma.transaction.create({
        data: {
          txData: JSON.stringify({ 
            amount, 
            swap: fromTokenLower === "usdc" ? "USDC_TO_USDS" : "USDS_TO_USDC"
          }),
          status: "pending",
          user: {
            connect: { id: user.id }
          }
        },
      });
      
      // Convert amount to token units (using 6 decimals for SPL token)
      const TOKEN_DECIMALS = 6;
      const amountInUnits = Math.floor(Number(amount) * (10 ** TOKEN_DECIMALS));
      
      // Prepare transaction based on swap direction
      if (fromTokenLower === "usdc" && toTokenLower === "usds") {
        console.log(`Creating USDC to USDs swap: ${amount} tokens (${amountInUnits} units with ${TOKEN_DECIMALS} decimals)`);
        
        // Define SPL_TOKEN_ADDRESS for USDC
        const SPL_TOKEN_ADDRESS = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // USDC on mainnet

        // Call swap-usdc-to-usds logic
        const userPublicKey = new PublicKey(user.solanaAddress);
        const usdcMint = new PublicKey(SPL_TOKEN_ADDRESS);
        const userUsdcAddress = await getAssociatedTokenAddress(
          usdcMint,
          userPublicKey
        );
        const userUsdsAddress = await getAssociatedTokenAddress(
          USDS_MINT,
          userPublicKey
        );
        
        // Create instruction data
        const instructionData = Buffer.concat([
          Buffer.from(SWAP_DISCRIMINATORS.swapUsdcToUsds),
          encodeU64(amountInUnits)
        ]);
        
        // Environment-specific API URL 
        const RELAYER_URL = process.env.RELAYER_URL || "https://api.relayer.solana.devnet";
        
        // Request the transaction from the relayer
        const createSwapResponse = await fetch(`${RELAYER_URL}/api/create-swap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fromAddress: user.solanaAddress,
            swapType: "USDC_TO_USDS",
            amount: amount,
            amountInRawUnits: amountInUnits,
            programId: USDS_PROGRAM_ID.toBase58(),
            accounts: {
              configAccount: CONFIG_ACCOUNT.toBase58(),
              userUsdcAddress: userUsdcAddress.toBase58(),
              userUsdsAddress: userUsdsAddress.toBase58(),
              treasuryPDA: TREASURY_PDA.toBase58(),
              treasuryTokenAccount: TREASURY_TOKEN_ACCOUNT.toBase58(),
              mintAuthorityPDA: MINT_AUTHORITY_PDA.toBase58(),
              usdsMint: USDS_MINT.toBase58(),
            },
            instructionData: Buffer.from(instructionData).toString('base64')
          }),
        });
        
        if (!createSwapResponse.ok) {
          let errorMessage = "Failed to create swap with relayer";
          try {
            const errorData = await createSwapResponse.json();
            errorMessage = errorData.error || errorMessage;
            console.error("Relayer error details:", errorData);
          } catch (parseError) {
            console.error("Could not parse relayer error response:", parseError);
          }
          throw new Error(errorMessage);
        }
        
        const createSwapData = await createSwapResponse.json();
        const serializedTransaction = createSwapData.transactionData;
        
        // Deserialize the transaction to sign it
        const transactionBuffer = Buffer.from(serializedTransaction, 'base64');
        const unsignedTransaction = Transaction.from(transactionBuffer);
        
        // User signs the transaction
        const messageToSign = unsignedTransaction.serializeMessage();
        // Use nacl.sign.detached to sign the message
        const signature = nacl.sign.detached(messageToSign, privateKeyBytes);
        unsignedTransaction.addSignature(keypair.publicKey, Buffer.from(signature));
        
        // Verify the transaction was signed correctly
        const isVerified = unsignedTransaction.verifySignatures();
        if (!isVerified) {
          throw new Error("Signature verification failed for transaction");
        }
        
        // Send the signed transaction back to the relayer for submission
        const signedSerializedTransaction = unsignedTransaction.serialize().toString('base64');
        
        // Submit the signed transaction to the relayer
        const submitResponse = await fetch(`${RELAYER_URL}/api/submit-transaction`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transaction: signedSerializedTransaction,
          }),
        });
        
        if (!submitResponse.ok) {
          let errorMessage = "Failed to submit swap transaction to relayer";
          try {
            const errorData = await submitResponse.json();
            errorMessage = errorData.error || errorMessage;
            console.error("Relayer submit error details:", errorData);
          } catch (parseError) {
            console.error("Could not parse relayer submit error response:", parseError);
          }
          throw new Error(errorMessage);
        }
        
        const submitData = await submitResponse.json();
        const { signature: txSignature } = submitData;
        
        // Update the transaction record with the executed status and signature
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "executed",
            signature: txSignature,
            executedAt: new Date(),
          },
        });
        
        return NextResponse.json(
          {
            success: true,
            signature: txSignature,
            message: "USDC to USDs swap sent successfully via relayer",
          },
          {
            headers: CORS_HEADERS
          }
        );
      } else {
        // USDS to USDC swap
        console.log(`Creating USDs to USDC swap: ${amount} tokens (${amountInUnits} units with ${TOKEN_DECIMALS} decimals)`);
        
        // Define SPL_TOKEN_ADDRESS for USDC
        const SPL_TOKEN_ADDRESS = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // USDC on mainnet
        
        // User token accounts
        const userPublicKey = new PublicKey(user.solanaAddress);
        const usdcMint = new PublicKey(SPL_TOKEN_ADDRESS);
        const userUsdcAddress = await getAssociatedTokenAddress(
          usdcMint,
          userPublicKey
        );
        const userUsdsAddress = await getAssociatedTokenAddress(
          USDS_MINT,
          userPublicKey
        );
        
        // Create instruction data
        const instructionData = Buffer.concat([
          Buffer.from(SWAP_DISCRIMINATORS.swapUsdsToUsdc),
          encodeU64(amountInUnits)
        ]);
        
        // Environment-specific API URL 
        const RELAYER_URL = process.env.RELAYER_URL || "https://api.relayer.solana.devnet";
        
        // Request the transaction from the relayer
        const createSwapResponse = await fetch(`${RELAYER_URL}/api/create-swap`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fromAddress: user.solanaAddress,
            swapType: "USDS_TO_USDC",
            amount: amount,
            amountInRawUnits: amountInUnits,
            programId: USDS_PROGRAM_ID.toBase58(),
            accounts: {
              configAccount: CONFIG_ACCOUNT.toBase58(),
              userUsdcAddress: userUsdcAddress.toBase58(),
              userUsdsAddress: userUsdsAddress.toBase58(),
              treasuryPDA: TREASURY_PDA.toBase58(),
              treasuryTokenAccount: TREASURY_TOKEN_ACCOUNT.toBase58(),
              usdsMint: USDS_MINT.toBase58(),
            },
            instructionData: Buffer.from(instructionData).toString('base64')
          }),
        });
        
        if (!createSwapResponse.ok) {
          let errorMessage = "Failed to create swap with relayer";
          try {
            const errorData = await createSwapResponse.json();
            errorMessage = errorData.error || errorMessage;
            console.error("Relayer error details:", errorData);
          } catch (parseError) {
            console.error("Could not parse relayer error response:", parseError);
          }
          throw new Error(errorMessage);
        }
        
        const createSwapData = await createSwapResponse.json();
        const serializedTransaction = createSwapData.transactionData;
        
        // Deserialize the transaction to sign it
        const transactionBuffer = Buffer.from(serializedTransaction, 'base64');
        const unsignedTransaction = Transaction.from(transactionBuffer);
        
        // User signs the transaction using nacl.sign.detached
        const messageToSign = unsignedTransaction.serializeMessage();
        const signature = nacl.sign.detached(messageToSign, privateKeyBytes);
        unsignedTransaction.addSignature(keypair.publicKey, Buffer.from(signature));
        
        // Verify the transaction was signed correctly
        const isVerified = unsignedTransaction.verifySignatures();
        if (!isVerified) {
          throw new Error("Signature verification failed for transaction");
        }
        
        // Send the signed transaction back to the relayer for submission
        const signedSerializedTransaction = unsignedTransaction.serialize().toString('base64');
        
        // Submit the signed transaction to the relayer
        const submitResponse = await fetch(`${RELAYER_URL}/api/submit-transaction`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transaction: signedSerializedTransaction,
          }),
        });
        
        if (!submitResponse.ok) {
          let errorMessage = "Failed to submit swap transaction to relayer";
          try {
            const errorData = await submitResponse.json();
            errorMessage = errorData.error || errorMessage;
            console.error("Relayer submit error details:", errorData);
          } catch (parseError) {
            console.error("Could not parse relayer submit error response:", parseError);
          }
          throw new Error(errorMessage);
        }
        
        const submitData = await submitResponse.json();
        const { signature: txSignature } = submitData;
        
        // Update the transaction record with the executed status and signature
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "executed",
            signature: txSignature,
            executedAt: new Date(),
          },
        });
        
        return NextResponse.json(
          {
            success: true,
            signature: txSignature,
            message: "USDs to USDC swap sent successfully via relayer",
          },
          {
            headers: CORS_HEADERS
          }
        );
      }
    } catch (error: any) {
      console.error("Error during swap process:", error);
      return NextResponse.json(
        { error: error.message || "Swap process failed" },
        { 
          status: 500,
          headers: CORS_HEADERS
        }
      );
    }
  } catch (error) {
    console.error("Error processing swap request:", error);
    return NextResponse.json(
      { error: "Failed to process swap request", details: error instanceof Error ? error.message : String(error) },
      { 
        status: 500,
        headers: CORS_HEADERS
      }
    );
  } finally {
    await prisma.$disconnect();
  }
} 