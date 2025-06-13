# Remlo Web App

Remlo is a modern, secure, and user-friendly web application for sending and receiving money instantly on the Solana blockchain. Built with Next.js, it provides a seamless experience for cryptocurrency transactions without the complexity of traditional crypto wallets.

## Features

- **Instant Payments**: Send and receive money in seconds on Solana
- **Simple Security**: Replace complex seed phrases with a 6-digit passcode
- **Payment Links**: Create shareable payment links with OTP verification
- **Payment Requests**: Request money from anyone with ease
- **Token Swaps**: Swap between USDC and USDs with competitive rates
- **Activity Tracking**: View complete transaction history
- **Mobile Responsive**: Works perfectly on all devices
- **Google Sign-In**: Easy authentication with Google accounts

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Authentication**: NextAuth.js with Google OAuth
- **Database**: PostgreSQL with Prisma ORM
- **Blockchain**: Solana Web3.js, SPL Token
- **Security**: Multi-Party Computation (MPC) for key management
- **Deployment**: Vercel/Netlify ready

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Google OAuth credentials
- Solana RPC endpoint

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/remlo-web.git
cd remlo-web
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Set up environment variables:
```bash
cp env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
npx prisma migrate dev
npx prisma generate
```

5. Run the development server:
```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production deployment instructions.

## Solana Connection Pooling

This project implements connection pooling for Solana RPC connections to improve performance and reduce rate limiting issues.

### Key Features 

- Reuses Solana connections across requests instead of creating new ones for each API call
- Caches connections based on endpoint, commitment level, and configuration
- Provides metrics for monitoring active connection count
- Reduces latency for blockchain interactions

### Implementation Details

The connection pooling is implemented in `src/lib/solana-connection-pool.ts` as a singleton class.

```typescript
// Example of getting a Solana connection from the pool
import connectionPool from "@/lib/solana-connection-pool";

// Get a connection with default parameters
const connection = connectionPool.getConnection();

// Get a connection with custom parameters
const customConnection = connectionPool.getConnection(
  "https://api.mainnet-beta.solana.com",
  "finalized"
);
```

You can view connection pool metrics at the `/api/admin/connection-pool` endpoint (development mode only, or with admin permissions in production).

### Benefits

- **Performance**: Eliminates connection initialization overhead
- **Reliability**: Reduces chances of hitting rate limits
- **Resource Efficiency**: Minimizes resource usage
- **Monitoring**: Provides visibility into connection usage

## Configuration System

The application uses a centralized configuration system to manage environment-specific settings like base URLs and API endpoints.

### Base URL Configuration

Payment links and API URLs use a consistent base URL configuration from `src/lib/config.ts`:

```typescript
// Example of generating a payment link
import { generatePaymentLink } from "@/lib/config";

// In API routes or server components
const paymentLink = generatePaymentLink(shortId, req);

// In client components
const paymentLink = generatePaymentLink(shortId);
```

### Environment Variables

The application uses the following environment variables:

```
# Base URL for generating payment links
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Solana RPC URL
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Database URL for Neon.tech or other PostgreSQL provider
DATABASE_URL="postgresql://username:password@hostname:port/database?sslmode=require&pgbouncer=true"
```

When deploying to production, be sure to set the `NEXT_PUBLIC_BASE_URL` to your domain name for proper payment link generation.
# Updated Mon May 26 12:16:05 IST 2025
