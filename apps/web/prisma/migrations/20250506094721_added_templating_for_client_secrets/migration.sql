-- CreateTable
CREATE TABLE "ClientSecretTemplate" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateType" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "variables" JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "botConfig" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "packageConstructor" TEXT,
    "packageName" TEXT,
    "packageType" TEXT,

    CONSTRAINT "ClientSecretTemplate_pkey" PRIMARY KEY ("id")
);
