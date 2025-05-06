/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `VerificationToken` will be added. If there are existing duplicate values, this will fail.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nickname" TEXT NOT NULL,
    "username" TEXT,
    "solanaAddress" TEXT NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "lastUsed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "description" TEXT,
    "frequency" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    CONSTRAINT "SavedTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shortId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "claimedAt" DATETIME,
    "claimedById" TEXT,
    "tokenMint" TEXT,
    "delegateAddress" TEXT,
    "approvalSignature" TEXT,
    CONSTRAINT "PaymentLink_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentLink_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentLinkTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentLinkId" TEXT NOT NULL,
    "signature" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "executedAt" DATETIME,
    CONSTRAINT "PaymentLinkTransaction_paymentLinkId_fkey" FOREIGN KEY ("paymentLinkId") REFERENCES "PaymentLink" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PaymentRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shortId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "recipientId" TEXT,
    "amount" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentRequest_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentRequest_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PaymentRequest" ("amount", "createdAt", "creatorId", "expiresAt", "id", "note", "shortId", "status", "tokenType", "updatedAt") SELECT "amount", "createdAt", "creatorId", "expiresAt", "id", "note", "shortId", "status", "tokenType", "updatedAt" FROM "PaymentRequest";
DROP TABLE "PaymentRequest";
ALTER TABLE "new_PaymentRequest" RENAME TO "PaymentRequest";
CREATE UNIQUE INDEX "PaymentRequest_shortId_key" ON "PaymentRequest"("shortId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "username" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "emailVerified" DATETIME,
    "phoneVerified" DATETIME,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "solanaAddress" TEXT,
    "encryptedKeypair" TEXT,
    "hasPasscode" BOOLEAN NOT NULL DEFAULT false,
    "passcodeSetAt" DATETIME,
    "passcodeHash" TEXT,
    "recoveryKey" TEXT,
    "mpcServerShare" TEXT,
    "mpcSalt" TEXT,
    "mpcBackupShare" TEXT,
    "usesMPC" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "encryptedKeypair", "hasPasscode", "id", "image", "mpcBackupShare", "mpcSalt", "mpcServerShare", "name", "passcodeSetAt", "phone", "phoneVerified", "solanaAddress", "updatedAt", "usesMPC") SELECT "createdAt", "email", "emailVerified", "encryptedKeypair", "hasPasscode", "id", "image", "mpcBackupShare", "mpcSalt", "mpcServerShare", "name", "passcodeSetAt", "phone", "phoneVerified", "solanaAddress", "updatedAt", "usesMPC" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_solanaAddress_key" ON "User"("solanaAddress");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Contact_userId_solanaAddress_key" ON "Contact"("userId", "solanaAddress");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLink_shortId_key" ON "PaymentLink"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLinkTransaction_paymentLinkId_key" ON "PaymentLinkTransaction"("paymentLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
