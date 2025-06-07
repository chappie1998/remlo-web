# Universal Wallet Setup Guide

This guide explains how to set up the universal wallet system that supports both Solana and Base blockchains.

## Environment Variables

Add these variables to your `.env` file:

```bash
# Existing Solana Configuration
NEXT_PUBLIC_SOLANA_RPC_URL="https://api.devnet.solana.com"
NEXT_PUBLIC_SOLANA_NETWORK="devnet"

# Okto Configuration for Base Support
VITE_OKTO_ENVIRONMENT="sandbox"
VITE_OKTO_CLIENT_PRIVATE_KEY="0xc206dc35bd93482f31fcca9a133fdd9249da73b9838c5a768f5b1c2f355d93ba"
VITE_OKTO_CLIENT_SWA="0x384329E7E4Ef201F2d129dDFA0FcB420B83975D2"
OKTO_TREASURY_API_KEY="0xfd3cf52cc0ea833572ddee613c891752e507a06e4026c88d5846ff1d3cf5ae13"
OKTO_PAYMASTER_SWA="0x06781f10f82D930f70C90818DB942f6957f78826"
OKTO_TREASURY_WALLET="0xD6794ca1EF92336eCc33E7316892a14F6dc409f1"

# Base Network Configuration
NEXT_PUBLIC_BASE_SEPOLIA_RPC="https://sepolia.base.org"
NEXT_PUBLIC_BASE_SEPOLIA_CHAIN_ID="84532"
NEXT_PUBLIC_BASE_USDC_ADDRESS="0x323e78f944A9a1FcF3a10efcC5319DBb0bB6e673"
```

## Database Migration

Run the database migration to add the new fields:

```bash
npx prisma db push
npx prisma generate
```

## Features

### 1. Chain Abstraction
- Users don't need to know about different blockchains
- System automatically chooses the best route for transfers
- USDC transfers prefer Base for lower fees
- USDS transfers use Solana
- ETH transfers use Base

### 2. Universal Wallet Setup
- Creates both Solana MPC wallet and Base Okto wallet simultaneously
- Single passcode for Solana transactions
- Gas-free transactions on Base via Okto sponsorship
- Unified username system

### 3. Smart Routing
- **USDC**: Prefers Base (lower fees, gas-free)
- **USDS**: Solana only
- **ETH**: Base only
- **SOL**: Solana only

### 4. Web2-like Experience
- Send money using just usernames (e.g., @alice)
- No need to understand blockchain addresses
- Automatic chain selection
- Unified transaction history

## API Endpoints

### Universal Setup
- `POST /api/wallet/universal-setup` - Creates both wallets
- `POST /api/universal/send` - Prepares transfers with optimal routing
- `GET /api/universal/balance` - Gets balances across all chains

### Chain-Specific (Internal)
- Solana: Existing MPC-based APIs
- Base: Okto SDK integration

## User Flow

1. **Sign Up**: Google OAuth authentication
2. **Wallet Setup**: 
   - Enter 6-digit passcode
   - System creates Solana MPC wallet
   - System creates Base Okto wallet
   - User gets single username
3. **Send Money**:
   - Enter recipient username
   - Enter amount and token
   - System determines best route
   - Execute transfer (passcode for Solana, gas-free for Base)

## Token Support

| Token | Solana | Base | Preferred Chain |
|-------|--------|------|----------------|
| USDC  | ✅     | ✅   | Base (gas-free) |
| USDS  | ✅     | ❌   | Solana         |
| ETH   | ❌     | ✅   | Base           |
| SOL   | ✅     | ❌   | Solana         |

## Security

- **Solana**: MPC with 3-part secret sharing
- **Base**: Okto's secure key management
- **Passcode**: Required only for Solana transactions
- **Gas Sponsorship**: Okto handles Base transaction fees

## Testing

1. Set up environment variables
2. Run database migration
3. Start development server
4. Create test account
5. Test transfers between users

## Production Deployment

1. Update environment variables for mainnet
2. Configure Okto for production environment
3. Update token contract addresses
4. Enable mainnet RPC endpoints

## Troubleshooting

### Common Issues
1. **Okto connection failed**: Check client private key and SWA
2. **Database errors**: Run `npx prisma generate`
3. **Transfer routing failed**: Verify user has required wallet type
4. **Gas sponsorship not working**: Check Okto treasury wallet funding

### Debug Commands
```bash
# Check database schema
npx prisma studio

# Verify environment variables
echo $VITE_OKTO_CLIENT_SWA

# Test Okto connection
# (Check browser console for Okto SDK logs)
``` 