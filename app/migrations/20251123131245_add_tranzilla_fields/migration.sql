-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tranzillaToken" TEXT;

-- CreateTable
CREATE TABLE "TranzillaTransaction" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "response" TEXT NOT NULL,
    "tranzilaTK" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranzillaTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TranzillaTransaction_transactionId_key" ON "TranzillaTransaction"("transactionId");
