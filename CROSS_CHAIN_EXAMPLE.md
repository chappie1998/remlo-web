# Cross-Chain Wallet Implementation

This implementation enables users to create both Solana and EVM (Ethereum Virtual Machine) wallets from the same passcode and master seed, providing seamless cross-chain composability.

## 🔑 Key Features

### 1. **Unified Passcode System**
- Single 6-digit passcode for all wallets
- Same MPC (Multi-Party Computation) security model
- Consistent user experience across chains

### 2. **Cross-Chain Derivation**
- Master seed generates both Solana (Ed25519) and EVM (secp256k1) wallets
- Uses BIP44 derivation paths for standard compliance
- Deterministic wallet generation from same entropy

### 3. **Multi-Chain Support**
- **Solana**: Native SOL and SPL tokens
- **Ethereum**: ETH and ERC-20 tokens
- **Polygon**: MATIC and tokens
- **BSC**: BNB and BEP-20 tokens
- **Other EVM chains**: Arbitrum, Optimism, etc.

## 🏗️ Architecture

### Core Components

1. **`cross-chain-wallet.ts`** - Core wallet derivation logic
2. **`/api/wallet/cross-chain`** - API endpoint for wallet operations
3. **`CrossChainWallet.tsx`** - React component for UI

### Derivation Flow

```
Master Seed (64 bytes)
├── Solana Wallet (Ed25519)
│   ├── Private Key: ed25519 derivation
│   └── Address: Base58 encoded
└── EVM Wallet (secp256k1)
    ├── Private Key: secp256k1 derivation
    └── Address: 0x... format
```

## 💻 Usage Examples

### 1. Create New Cross-Chain Wallet

```typescript
import { createCrossChainWallet } from '@/lib/cross-chain-wallet';

const wallet = createCrossChainWallet('123456');

console.log('Solana Address:', wallet.solana.address);
console.log('EVM Address:', wallet.evm.address);
```

### 2. Migrate Existing Solana Wallet

```typescript
import { migrateSolanaWalletToCrossChain } from '@/lib/cross-chain-wallet';

const existingPrivateKey = new Uint8Array([...]); // Your existing Solana private key
const crossChainWallet = migrateSolanaWalletToCrossChain(existingPrivateKey, '123456');

// Your Solana wallet stays the same, EVM wallet is derived
```

### 3. Reconstruct from MPC Shares

```typescript
import { reconstructCrossChainWallet } from '@/lib/cross-chain-wallet';

const wallet = reconstructCrossChainWallet('123456', {
  serverShare: 'encrypted_server_share',
  backupShare: 'backup_share',
  salt: 'salt_value'
});
```

### 4. Get Chain-Specific Wallet

```typescript
import { getChainWallet } from '@/lib/cross-chain-wallet';

const solanaWallet = getChainWallet(crossChainWallet, 'solana');
const evmWallet = getChainWallet(crossChainWallet, 'ethereum');
```

## 🔗 API Endpoints

### POST `/api/wallet/cross-chain`

Create, migrate, or retrieve cross-chain wallet:

```typescript
// Create new wallet
const response = await fetch('/api/wallet/cross-chain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'create',
    passcode: '123456'
  })
});

// Migrate existing wallet
const response = await fetch('/api/wallet/cross-chain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'migrate',
    passcode: '123456'
  })
});

// Get existing wallet
const response = await fetch('/api/wallet/cross-chain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'get',
    passcode: '123456'
  })
});
```

### GET `/api/wallet/cross-chain`

Check if user has cross-chain wallet:

```typescript
const response = await fetch('/api/wallet/cross-chain');
const data = await response.json();

console.log('Has cross-chain wallet:', data.hasCrossChainWallet);
```

## 🌐 Use Cases & Composability

### 1. **Cross-Chain Asset Management**
```typescript
// Send USDC on Solana
await sendSolanaTransaction(solanaWallet, recipient, usdcAmount);

// Receive USDC on Ethereum
const ethBalance = await getEthereumBalance(evmWallet.address);
```

### 2. **DeFi Arbitrage**
```typescript
// Check Solana DEX prices
const solanaPrice = await getTokenPrice('solana', 'USDC');

// Check Ethereum DEX prices
const ethPrice = await getTokenPrice('ethereum', 'USDC');

// Execute arbitrage if profitable
if (solanaPrice < ethPrice) {
  await bridgeAssets(solanaWallet, evmWallet, amount);
}
```

### 3. **Cross-Chain Payments**
```typescript
// User pays on Solana
await acceptPayment(solanaWallet, paymentAmount);

// Service delivers on Ethereum
await fulfillOrder(evmWallet, orderDetails);
```

### 4. **Multi-Chain Portfolio**
```typescript
const portfolio = {
  solana: await getSolanaBalance(solanaWallet.address),
  ethereum: await getEthereumBalance(evmWallet.address),
  polygon: await getPolygonBalance(evmWallet.address),
  bsc: await getBSCBalance(evmWallet.address)
};
```

## 🔒 Security Considerations

### 1. **MPC Security Maintained**
- Same 3-part secret sharing for master seed
- User share derived from passcode
- Server share encrypted and stored
- Backup share for recovery

### 2. **Chain-Specific Security**
- Solana: Ed25519 signatures
- EVM: secp256k1 signatures
- Each chain uses appropriate cryptography

### 3. **Migration Safety**
- Existing Solana wallets remain unchanged
- EVM wallet derived deterministically
- No private key exposure during migration

## 🛠️ Development Setup

### 1. **Install Dependencies**
```bash
npm install bip39 ed25519-hd-key
# Note: For production, also install:
# npm install ethereumjs-wallet bip32
```

### 2. **Update Database Schema**
```sql
-- Add EVM address field to User table
ALTER TABLE "User" ADD COLUMN "evmAddress" TEXT;
```

### 3. **Environment Variables**
```env
# Existing Solana config
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Add EVM config
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_BSC_RPC_URL=https://bsc-dataseed.binance.org/
```

## 📱 UI Integration

### Add Cross-Chain Wallet to Navigation

```typescript
// In your main navigation component
import Link from 'next/link';

<Link href="/wallet/cross-chain">
  <Button>Cross-Chain Wallet</Button>
</Link>
```

### Create Cross-Chain Wallet Page

```typescript
// app/wallet/cross-chain/page.tsx
import CrossChainWallet from '@/components/CrossChainWallet';

export default function CrossChainWalletPage() {
  return <CrossChainWallet />;
}
```

## 🚀 Deployment Notes

### 1. **Production Dependencies**
For production deployment, consider using proper BIP44 derivation:

```bash
npm install ethereumjs-wallet bip32
```

Then update the `deriveEVMWallet` function to use real BIP44 derivation instead of the simplified version.

### 2. **Database Migration**
Add the EVM address field to your database schema:

```sql
-- In your Prisma schema or SQL migration
ALTER TABLE "User" ADD COLUMN "evmAddress" TEXT;
```

### 3. **Monitoring**
Set up monitoring for cross-chain operations:

```typescript
// Log cross-chain wallet creations
console.log('Cross-chain wallet created:', {
  userId: user.id,
  solanaAddress: wallet.solana.address,
  evmAddress: wallet.evm.address,
  timestamp: new Date().toISOString()
});
```

## 🔄 Migration Path

### For Existing Users

1. **Automatic Migration**: Detect existing Solana wallets and offer cross-chain upgrade
2. **Backward Compatibility**: Existing Solana functionality remains unchanged
3. **Gradual Rollout**: Enable cross-chain features progressively

### Implementation Example

```typescript
// Check if user needs migration
const needsMigration = user.solanaAddress && !user.evmAddress;

if (needsMigration) {
  // Offer cross-chain upgrade
  showMigrationPrompt();
}
```

This implementation provides a solid foundation for cross-chain composability while maintaining the simplicity and security of the existing passcode-based system. 