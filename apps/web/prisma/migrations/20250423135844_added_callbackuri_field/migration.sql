-- DropIndex
DROP INDEX "WhatsAppVerification_clientSecretId_key";

-- AlterTable
ALTER TABLE "WhatsAppVerification" ADD COLUMN     "callbackUri" TEXT;

-- CreateIndex
CREATE INDEX "WhatsAppVerification_clientSecretId_code_idx" ON "WhatsAppVerification"("clientSecretId", "code");
