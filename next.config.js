/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // This allows production builds to successfully complete even if
    // the project has ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // This allows production builds to successfully complete even if
    // the project has type errors
    ignoreBuildErrors: true,
  },
  // Add environment variables that should be available to the client
  env: {
    NEXT_PUBLIC_SOLANA_NETWORK: 'devnet',
  }
};

module.exports = nextConfig;
