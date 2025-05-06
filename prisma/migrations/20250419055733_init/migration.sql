-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
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
    "mpcServerShare" TEXT,
    "mpcSalt" TEXT,
    "mpcBackupShare" TEXT,
    "usesMPC" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "encryptedKeypair", "hasPasscode", "id", "image", "name", "passcodeSetAt", "phone", "phoneVerified", "solanaAddress", "updatedAt") SELECT "createdAt", "email", "emailVerified", "encryptedKeypair", "hasPasscode", "id", "image", "name", "passcodeSetAt", "phone", "phoneVerified", "solanaAddress", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_solanaAddress_key" ON "User"("solanaAddress");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
