/*
  Warnings:

  - A unique constraint covering the columns `[proofEndToEndId]` on the table `FinancialTransaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "FinancialTransaction" ADD COLUMN     "proofBankName" TEXT,
ADD COLUMN     "proofConfidence" INTEGER,
ADD COLUMN     "proofEndToEndId" TEXT,
ADD COLUMN     "proofPayerName" TEXT,
ADD COLUMN     "proofPixKey" TEXT,
ADD COLUMN     "proofRawText" TEXT,
ADD COLUMN     "proofRecipientName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FinancialTransaction_proofEndToEndId_key" ON "FinancialTransaction"("proofEndToEndId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_proofEndToEndId_idx" ON "FinancialTransaction"("proofEndToEndId");
