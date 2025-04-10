-- CreateEnum
CREATE TYPE "DEPLOY_STAGE" AS ENUM ('DEV', 'PROD', 'STAGING', 'PREVIEW');

-- CreateEnum
CREATE TYPE "REQUESTSTATUS" AS ENUM ('UN_ASSIGNED', 'IN_DEVELOPMENT', 'IN_REVIEW', 'CLOSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FUNCTIONTYPE" AS ENUM ('WEBHOOK', 'CRON', 'MIXED');

-- CreateTable
CREATE TABLE "ConfigData" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "configType" TEXT NOT NULL DEFAULT '',
    "configApp" TEXT DEFAULT 'portal',
    "configData" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoxTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "foxType" TEXT NOT NULL,
    "foxDescription" TEXT NOT NULL,
    "focCapabilities" TEXT[],
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoxTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatUIMessage" (
    "id" TEXT NOT NULL,
    "context" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parts" JSONB[],
    "attachments" JSONB[],
    "annotations" JSONB[],
    "minionId" TEXT,
    "minionType" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "originClientRequestId" TEXT NOT NULL,
    "revisionId" TEXT,
    "toolInvocations" JSONB[],

    CONSTRAINT "ChatUIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "githubRepoName" TEXT NOT NULL,
    "githubRepoUrl" TEXT NOT NULL,
    "githubRepoBranch" TEXT DEFAULT 'main',
    "prUrl" TEXT,
    "prNumber" INTEGER,
    "description" TEXT,
    "projectDir" TEXT NOT NULL,
    "templateVersion" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientRequest" (
    "id" TEXT NOT NULL,
    "botProjectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mentionedClientSecretIds" TEXT[],
    "title" TEXT NOT NULL DEFAULT 'Untitled',
    "description" TEXT,
    "repoName" TEXT,
    "prUrl" TEXT,
    "prNumber" INTEGER,
    "prBranch" TEXT,
    "prTargetBranch" TEXT,
    "requestDir" TEXT,
    "requestStatus" "REQUESTSTATUS" NOT NULL DEFAULT 'UN_ASSIGNED',
    "templateVersion" TEXT,
    "metadata" JSONB,
    "lastUpdatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskInstanceMeta" (
    "id" TEXT NOT NULL,
    "originClientRequestId" TEXT NOT NULL,
    "taskInfo" JSONB,
    "initialSummary" TEXT,
    "taskIntegrations" JSONB,
    "taskRequiredInfo" JSONB,
    "taskStructure" JSONB,
    "buildingStep" JSONB,
    "deployStep" JSONB,
    "minionType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskInstanceMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageAnalytics" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT,
    "hour" TEXT,
    "day" TEXT,
    "month" TEXT,

    CONSTRAINT "UsageAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSecret" (
    "id" TEXT NOT NULL,
    "botProjectId" TEXT NOT NULL,
    "clientRequestIds" TEXT[],
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "variables" JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientDeployment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "botProjectId" TEXT NOT NULL,
    "originClientRequestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "stage" "DEPLOY_STAGE" NOT NULL,
    "type" "FUNCTIONTYPE" NOT NULL,
    "docs" TEXT,
    "endpoints" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "schedules" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientDeployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestUpdate" (
    "id" TEXT NOT NULL,
    "originClientRequestId" TEXT NOT NULL,
    "botProjectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prUrl" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "prBranch" TEXT NOT NULL,
    "prTargetBranch" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfigData_configId_key" ON "ConfigData"("configId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BotProject_githubRepoName_key" ON "BotProject"("githubRepoName");

-- CreateIndex
CREATE UNIQUE INDEX "TaskInstanceMeta_originClientRequestId_key" ON "TaskInstanceMeta"("originClientRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageAnalytics_id_key" ON "UsageAnalytics"("id");

-- CreateIndex
CREATE UNIQUE INDEX "UsageAnalytics_matchId_key" ON "UsageAnalytics"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientDeployment_name_key" ON "ClientDeployment"("name");

-- AddForeignKey
ALTER TABLE "ChatUIMessage" ADD CONSTRAINT "ChatUIMessage_minionId_fkey" FOREIGN KEY ("minionId") REFERENCES "FoxTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatUIMessage" ADD CONSTRAINT "ChatUIMessage_originClientRequestId_fkey" FOREIGN KEY ("originClientRequestId") REFERENCES "ClientRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRequest" ADD CONSTRAINT "ClientRequest_botProjectId_fkey" FOREIGN KEY ("botProjectId") REFERENCES "BotProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskInstanceMeta" ADD CONSTRAINT "TaskInstanceMeta_originClientRequestId_fkey" FOREIGN KEY ("originClientRequestId") REFERENCES "ClientRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSecret" ADD CONSTRAINT "ClientSecret_botProjectId_fkey" FOREIGN KEY ("botProjectId") REFERENCES "BotProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientDeployment" ADD CONSTRAINT "ClientDeployment_originClientRequestId_fkey" FOREIGN KEY ("originClientRequestId") REFERENCES "ClientRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestUpdate" ADD CONSTRAINT "RequestUpdate_originClientRequestId_fkey" FOREIGN KEY ("originClientRequestId") REFERENCES "ClientRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
