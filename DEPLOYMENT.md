# Remlo Web App - Production Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables
Copy `env.example` to `.env` and configure all required variables:

**Critical Variables:**
- `DATABASE_URL` - Production PostgreSQL database
- `NEXTAUTH_SECRET` - Strong random secret (32+ characters)
- `NEXTAUTH_URL` - Your production domain
- `GOOGLE_ID` & `GOOGLE_SECRET` - Google OAuth credentials
- `NEXT_PUBLIC_BASE_URL` - Your production domain
- `NEXT_PUBLIC_SOLANA_NETWORK` - Set to "mainnet-beta" for production
- `NEXT_PUBLIC_SOLANA_RPC_URL` - Mainnet RPC endpoint
- `NEXT_PUBLIC_RELAYER_URL` - Your relayer service URL

### 2. Database Setup
1. Set up PostgreSQL database (recommended: Neon, Supabase, or Railway)
2. Run migrations: `npx prisma migrate deploy`
3. Generate Prisma client: `npx prisma generate`

### 3. Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add your production domain to authorized origins
6. Add `https://yourdomain.com/api/auth/callback/google` to redirect URIs

### 4. Solana Configuration
1. Update token mint addresses for mainnet
2. Configure mainnet RPC endpoint (Alchemy, QuickNode, or Helius recommended)
3. Set up relayer service on mainnet

### 5. Security
1. Generate strong secrets for all environment variables
2. Enable HTTPS (handled by most hosting platforms)
3. Configure CSP headers if needed
4. Review and update CORS settings

## Deployment Platforms

### Vercel (Recommended)
1. Connect GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Netlify
1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Set environment variables in Netlify dashboard

### Railway
1. Connect GitHub repository
2. Add PostgreSQL service
3. Set environment variables
4. Deploy

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Post-Deployment

### 1. DNS Configuration
- Point your domain to the hosting platform
- Set up SSL certificate (usually automatic)

### 2. Monitoring
- Set up error tracking (Sentry recommended)
- Monitor database performance
- Set up uptime monitoring

### 3. Testing
- Test all authentication flows
- Verify wallet creation and transactions
- Test payment links and requests
- Check mobile responsiveness

### 4. Analytics (Optional)
- Google Analytics
- Mixpanel for user events
- PostHog for product analytics

## Environment-Specific Notes

### Development
- Use devnet for Solana
- Local database or development database
- Test Google OAuth credentials

### Staging
- Use devnet for Solana
- Staging database
- Production-like environment variables

### Production
- Use mainnet-beta for Solana
- Production database with backups
- All production credentials and secrets

## Troubleshooting

### Common Issues
1. **Database connection errors**: Check DATABASE_URL format and network access
2. **Google OAuth errors**: Verify redirect URIs and domain configuration
3. **Solana RPC errors**: Check network and RPC endpoint configuration
4. **Build errors**: Ensure all environment variables are set

### Performance Optimization
1. Enable database connection pooling
2. Use CDN for static assets
3. Implement proper caching headers
4. Monitor and optimize bundle size

## Security Considerations
1. Never commit `.env` files
2. Use strong, unique secrets
3. Regularly rotate API keys
4. Monitor for security vulnerabilities
5. Keep dependencies updated

## Backup Strategy
1. Database backups (automated)
2. Environment variable backups
3. Code repository backups
4. SSL certificate backups 