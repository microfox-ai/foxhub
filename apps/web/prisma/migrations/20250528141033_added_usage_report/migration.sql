-- CreateTable
CREATE TABLE "UsageReport" (
    "id" TEXT NOT NULL,
    "originClientRequestId" TEXT,
    "originBotProjectId" TEXT,
    "priceUSD" DOUBLE PRECISION NOT NULL,
    "cycle" TEXT NOT NULL DEFAULT 'daily',
    "dateKey" TEXT NOT NULL,
    "description" TEXT,
    "computeTime" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "usageLogs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageReport_pkey" PRIMARY KEY ("id")
);
