import { PrismaClient } from '@prisma/client';

// For development environment, we'll still use a global instance to prevent too many connections
// But in production (serverless), we'll create a new instance per request
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Function to get a new PrismaClient instance
export function getPrismaClient() {
  // For production (serverless environment), create a new instance each time
  if (process.env.NODE_ENV === 'production') {
    return new PrismaClient();
  }
  
  // For development, reuse the same instance
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  
  return globalForPrisma.prisma;
}

// Legacy export for backward compatibility
export const prisma = globalForPrisma.prisma || new PrismaClient();

// Update global in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default getPrismaClient; 