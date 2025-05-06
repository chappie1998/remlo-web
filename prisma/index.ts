import { PrismaClient } from '@prisma/client';

// Add PaymentLink to PrismaClient type
declare global {
  var prisma: PrismaClient;
}

// Use a single instance of Prisma to prevent too many connections
export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma; 