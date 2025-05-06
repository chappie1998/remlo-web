# Payment Link Relayer System

This document explains how the payment link feature works with the relayer system to facilitate gasless token transfers.

## Overview

The payment link feature allows users to:
1. Create payment links with OTP verification
2. Share links with recipients
3. Recipients can claim payments by verifying the OTP
4. The relayer transfers tokens and pays gas fees

## System Components

### 1. Payment Link Creation
- User creates a payment link with an amount, token type, and their wallet passcode
- System generates a 6-digit OTP and cryptographic verification data
- User's tokens are pre-approved for delegation to the relayer's address
- The payment link is stored in the database with verification data and delegation details

### 2. Token Delegation
- When a payment link is created, the system uses the user's passcode to sign a token approval transaction
- This transaction pre-approves the relayer to spend a specific amount of tokens on behalf of the user
- The relayer's public key is stored as the delegate address

### 3. Payment Claiming Process
- Recipient opens the payment link and enters the OTP
- System verifies the OTP cryptographically
- If valid, the relayer transfers the tokens from sender to recipient
- The relayer pays all gas fees for the transfer

### 4. Relayer Implementation
- The relayer is a separate service that handles token transfers
- It uses its private key to sign transactions and pay gas fees
- For payment links, it executes transfers using pre-approved token delegations

## Technical Details

### Token Delegation
```typescript
// The sender approves tokens to be spent by the relayer
const approveTransaction = new Transaction().add(
  createApproveInstruction(
    senderTokenAccount,
    delegatePublicKey, // Relayer's address
    senderPublicKey,
    BigInt(amountInLamports)
  )
);
```

### Relayer Transfer
```typescript
// The relayer transfers tokens from sender to recipient
const transferTransaction = new Transaction().add(
  createTransferCheckedInstruction(
    senderTokenAccount,
    tokenMint,
    receiverTokenAccount,
    delegatePublicKey, // Using relayer's delegation authority
    BigInt(amountInLamports),
    decimals,
    [],
    TOKEN_PROGRAM_ID
  )
);

// Relayer pays the gas fees
transferTransaction.feePayer = delegatePublicKey;
```

## Security Considerations

1. **Delegate Authority**: The relayer can only transfer the specific amount of tokens that were pre-approved, not the user's entire balance.

2. **OTP Verification**: Payment links use a one-time password that is verified cryptographically without storing the actual OTP.

3. **Expiration**: Payment links have an expiration date after which they can no longer be claimed.

4. **Status Tracking**: Payment links track their status (active, claimed, expired) to prevent double-spending.

## Environment Configuration

For the payment link relayer system to work, these environment variables must be configured:

```
# Relayer Configuration
DELEGATE_PUBLIC_KEY="EySMRJYTwox5gsn2841CdMVd8QEwFYRZfx4ztojjUU75"
DELEGATE_PRIVATE_KEY="your-base64-encoded-delegate-private-key"

# Payment Link Configuration
OTP_SERVER_SECRET="payment-link-secret-key-change-in-production" 
```

## Generating Relayer Keys

To generate a new keypair for the relayer:

```bash
solana-keygen new --outfile relayer-keypair.json
# Convert to Base64 for environment variable
cat relayer-keypair.json | base64
```

Store the public key in `DELEGATE_PUBLIC_KEY` and the Base64-encoded private key in `DELEGATE_PRIVATE_KEY`. 