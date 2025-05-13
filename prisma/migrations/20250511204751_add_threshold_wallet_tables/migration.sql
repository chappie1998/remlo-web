-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "walletType" TEXT NOT NULL,
    "userShareIndex" INTEGER NOT NULL,
    "saltBase64" TEXT NOT NULL,
    "encryptedServerShare" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecoveryShare" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "encryptedShare" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecoveryShare_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_publicKey_key" ON "Wallet"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryShare_walletId_key" ON "RecoveryShare"("walletId");
