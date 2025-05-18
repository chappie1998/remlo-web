This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

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
