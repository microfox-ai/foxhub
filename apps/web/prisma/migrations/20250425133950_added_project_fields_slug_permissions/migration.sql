-- AlterTable
ALTER TABLE "BotProject" ADD COLUMN     "slug" TEXT;

-- CreateTable
CREATE TABLE "ProjectPermission" (
    "id" TEXT NOT NULL,
    "botProjectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessType" "PROJECT_ACCESS_TYPE" NOT NULL,
    "role" "PROJECTROLE" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectPermission_botProjectId_idx" ON "ProjectPermission"("botProjectId");

-- CreateIndex
CREATE INDEX "ProjectPermission_userId_idx" ON "ProjectPermission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPermission_botProjectId_userId_key" ON "ProjectPermission"("botProjectId", "userId");

-- AddForeignKey
ALTER TABLE "ProjectPermission" ADD CONSTRAINT "ProjectPermission_botProjectId_fkey" FOREIGN KEY ("botProjectId") REFERENCES "BotProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPermission" ADD CONSTRAINT "ProjectPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
