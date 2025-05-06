import { Prisma, PrismaClient } from '@prisma/client';

// Extend PrismaClient with PaymentLink model
declare global {
  namespace PrismaJson {
    type PaymentLinkType = {
      id: string;
      shortId: string;
      creatorId: string;
      amount: string;
      tokenType: string;
      note?: string;
      status: string;
      verificationData: string;
      delegationTx?: string;
      claimedBy?: string;
      claimedAt?: Date;
      expiresAt: Date;
      createdAt: Date;
      updatedAt: Date;
      creator: {
        id: string;
        name?: string;
        username?: string;
        email: string;
        solanaAddress?: string;
      };
    };
  }
} 