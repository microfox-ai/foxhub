-- CreateTable
CREATE TABLE "WhatsAppVerification" (
    "id" TEXT NOT NULL,
    "clientSecretId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppVerification_clientSecretId_key" ON "WhatsAppVerification"("clientSecretId");

-- CreateIndex
CREATE INDEX "WhatsAppVerification_userId_idx" ON "WhatsAppVerification"("userId");

-- CreateIndex
CREATE INDEX "WhatsAppVerification_clientSecretId_idx" ON "WhatsAppVerification"("clientSecretId");

-- CreateIndex
CREATE INDEX "WhatsAppVerification_slug_idx" ON "WhatsAppVerification"("slug");
