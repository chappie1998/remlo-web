/*
  Warnings:

  - You are about to drop the `PaymentLinkTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `approvalSignature` on the `PaymentLink` table. All the data in the column will be lost.
  - You are about to drop the column `claimedById` on the `PaymentLink` table. All the data in the column will be lost.
  - You are about to drop the column `delegateAddress` on the `PaymentLink` table. All the data in the column will be lost.
  - You are about to drop the column `delegationSignature` on the `PaymentLink` table. All the data in the column will be lost.
  - You are about to drop the column `delegationStatus` on the `PaymentLink` table. All the data in the column will be lost.
  - You are about to drop the column `otpHash` on the `PaymentLink` table. All the data in the column will be lost.
  - You are about to drop the column `tokenMint` on the `PaymentLink` table. All the data in the column will be lost.
  - Added the required column `verificationData` to the `PaymentLink` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "PaymentLinkTransaction_paymentLinkId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PaymentLinkTransaction";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PaymentLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shortId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL,
    "verificationData" TEXT NOT NULL DEFAULT 'legacy-data-migrated',
    "delegationTx" TEXT,
    "claimedBy" TEXT,
    "claimedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentLink_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PaymentLink" ("amount", "claimedAt", "createdAt", "creatorId", "expiresAt", "id", "note", "shortId", "status", "tokenType", "updatedAt") SELECT "amount", "claimedAt", "createdAt", "creatorId", "expiresAt", "id", "note", "shortId", "status", "tokenType", "updatedAt" FROM "PaymentLink";
DROP TABLE "PaymentLink";
ALTER TABLE "new_PaymentLink" RENAME TO "PaymentLink";
CREATE UNIQUE INDEX "PaymentLink_shortId_key" ON "PaymentLink"("shortId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
