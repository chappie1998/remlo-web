/*
  Warnings:

  - Made the column `expiresAt` on table `PaymentLink` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PaymentLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shortId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "otpHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "claimedAt" DATETIME,
    "claimedById" TEXT,
    "tokenMint" TEXT,
    "delegateAddress" TEXT,
    "approvalSignature" TEXT,
    "delegationSignature" TEXT,
    "delegationStatus" TEXT,
    CONSTRAINT "PaymentLink_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentLink_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PaymentLink" ("amount", "approvalSignature", "claimedAt", "claimedById", "createdAt", "creatorId", "delegateAddress", "expiresAt", "id", "note", "otpHash", "shortId", "status", "tokenMint", "tokenType", "updatedAt") SELECT "amount", "approvalSignature", "claimedAt", "claimedById", "createdAt", "creatorId", "delegateAddress", "expiresAt", "id", "note", "otpHash", "shortId", "status", "tokenMint", "tokenType", "updatedAt" FROM "PaymentLink";
DROP TABLE "PaymentLink";
ALTER TABLE "new_PaymentLink" RENAME TO "PaymentLink";
CREATE UNIQUE INDEX "PaymentLink_shortId_key" ON "PaymentLink"("shortId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
