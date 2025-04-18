-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PaymasterInfo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "networkName" TEXT NOT NULL,
    "gasSponsored" INTEGER NOT NULL DEFAULT 0,
    "lastSponsoredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PaymasterInfo" ("createdAt", "gasSponsored", "id", "lastSponsoredAt", "networkName", "updatedAt") SELECT "createdAt", "gasSponsored", "id", "lastSponsoredAt", "networkName", "updatedAt" FROM "PaymasterInfo";
DROP TABLE "PaymasterInfo";
ALTER TABLE "new_PaymasterInfo" RENAME TO "PaymasterInfo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
