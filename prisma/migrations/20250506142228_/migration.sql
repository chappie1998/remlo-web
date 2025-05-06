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
    "verificationData" TEXT NOT NULL,
    "delegationTx" TEXT,
    "claimedBy" TEXT,
    "claimedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentLink_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PaymentLink" ("amount", "claimedAt", "claimedBy", "createdAt", "creatorId", "delegationTx", "expiresAt", "id", "note", "shortId", "status", "tokenType", "updatedAt", "verificationData") SELECT "amount", "claimedAt", "claimedBy", "createdAt", "creatorId", "delegationTx", "expiresAt", "id", "note", "shortId", "status", "tokenType", "updatedAt", "verificationData" FROM "PaymentLink";
DROP TABLE "PaymentLink";
ALTER TABLE "new_PaymentLink" RENAME TO "PaymentLink";
CREATE UNIQUE INDEX "PaymentLink_shortId_key" ON "PaymentLink"("shortId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
