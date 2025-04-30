-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shortId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentRequest_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payerId" TEXT NOT NULL,
    "paymentRequestId" TEXT NOT NULL,
    "transactionSignature" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "PaymentRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_shortId_key" ON "PaymentRequest"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentRequestId_key" ON "Payment"("paymentRequestId");
