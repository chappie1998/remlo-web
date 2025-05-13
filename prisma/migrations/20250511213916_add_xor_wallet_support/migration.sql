-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "walletType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userShareIndex" INTEGER,
    "saltBase64" TEXT,
    "encryptedServerShare" TEXT,
    "salt" TEXT,
    "encryptedShare" TEXT,
    CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Wallet" ("createdAt", "encryptedServerShare", "id", "publicKey", "saltBase64", "updatedAt", "userId", "userShareIndex", "walletType") SELECT "createdAt", "encryptedServerShare", "id", "publicKey", "saltBase64", "updatedAt", "userId", "userShareIndex", "walletType" FROM "Wallet";
DROP TABLE "Wallet";
ALTER TABLE "new_Wallet" RENAME TO "Wallet";
CREATE UNIQUE INDEX "Wallet_publicKey_key" ON "Wallet"("publicKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
