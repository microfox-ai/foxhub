-- CreateTable
CREATE TABLE "SubdomainRedirect" (
    "id" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "rewritePath" TEXT NOT NULL,
    "rewriteType" TEXT NOT NULL,
    "hostedOn" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "SubdomainRedirect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubdomainRedirect_subdomain_key" ON "SubdomainRedirect"("subdomain");
