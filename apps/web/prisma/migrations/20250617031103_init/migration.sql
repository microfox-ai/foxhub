-- CreateEnum
CREATE TYPE "CLIENTSECRETSTATUS" AS ENUM ('EMPTY', 'FILLED');

-- CreateEnum
CREATE TYPE "DEPLOY_STAGE" AS ENUM ('DEV', 'PROD', 'STAGING', 'PREVIEW');

-- CreateEnum
CREATE TYPE "DEPLOY_STATUS" AS ENUM ('TRIGGERED', 'DEPLOYED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "REQUESTSTATUS" AS ENUM ('UN_ASSIGNED', 'IN_DEVELOPMENT', 'IN_REVIEW', 'CLOSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FUNCTIONTYPE" AS ENUM ('WEBHOOK', 'CRON', 'MIXED');

-- CreateEnum
CREATE TYPE "PROJECTROLE" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "PROJECT_ACCESS_TYPE" AS ENUM ('READ', 'WRITE');

-- CreateEnum
CREATE TYPE "SHARD_PAGE_STATUS" AS ENUM ('UNPUBLISHED', 'PUBLISHED');

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
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "onboardingData" JSONB,
    "isAdmin" BOOLEAN,
    "isBetaAccess" BOOLEAN,
    "isBillingVerified" BOOLEAN,

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
    "minionFlow" TEXT,
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
    "awsRegion" TEXT NOT NULL DEFAULT 'us-east-1',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archiveStatus" TEXT,
    "slug" TEXT,
    "imageUrl" TEXT,
    "homepageUrl" TEXT,

    CONSTRAINT "BotProject_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "ClientRequest" (
    "id" TEXT NOT NULL,
    "botProjectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mentionedClientSecretIds" TEXT[],
    "title" TEXT NOT NULL DEFAULT 'Untitled',
    "minionFlow" TEXT,
    "description" TEXT,
    "repoName" TEXT,
    "prUrl" TEXT,
    "prNumber" INTEGER,
    "prBranch" TEXT,
    "prTargetBranch" TEXT,
    "awsRegion" TEXT NOT NULL DEFAULT 'us-east-1',
    "requestDir" TEXT,
    "requestStatus" "REQUESTSTATUS" NOT NULL DEFAULT 'UN_ASSIGNED',
    "archiveStatus" TEXT,
    "templateVersion" TEXT,
    "metadata" JSONB,
    "lastUpdatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serviceName" TEXT,

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
    "invocations" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT,
    "hour" TEXT,
    "day" TEXT,
    "month" TEXT,
    "requestId" TEXT,
    "projectId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "status" "CLIENTSECRETSTATUS" NOT NULL DEFAULT 'FILLED',
    "botConfig" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "clientDeploymentIds" TEXT[],
    "packageConstructor" TEXT,
    "packageName" TEXT,
    "packageType" TEXT,
    "isHidden" BOOLEAN,
    "templateId" TEXT,

    CONSTRAINT "ClientSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSecretTemplate" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateType" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "imageUrl" TEXT,
    "variables" JSONB[],
    "priceMarkupPercent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "botConfig" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "packageConstructor" TEXT,
    "packageName" TEXT,
    "packageType" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ClientSecretTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientDeployment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "botProjectId" TEXT NOT NULL,
    "originClientRequestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sha" TEXT,
    "baseUrl" TEXT NOT NULL,
    "awsRegion" TEXT NOT NULL DEFAULT 'us-east-1',
    "stage" "DEPLOY_STAGE" NOT NULL,
    "type" "FUNCTIONTYPE" NOT NULL,
    "status" "DEPLOY_STATUS" NOT NULL DEFAULT 'TRIGGERED',
    "docs" TEXT,
    "endpoints" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "schedules" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientSecretIds" TEXT[],

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
    "callbackUri" TEXT,

    CONSTRAINT "WhatsAppVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShardPage" (
    "id" TEXT NOT NULL,
    "taskInstanceMeta" JSONB NOT NULL,
    "status" "SHARD_PAGE_STATUS" NOT NULL DEFAULT 'UNPUBLISHED',
    "category" TEXT[],
    "clientRequestMeta" JSONB NOT NULL,
    "repoDir" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "miniDescription" TEXT,
    "description" TEXT,
    "video_url" TEXT,
    "thumbnail_url" TEXT,
    "banner_url" TEXT,
    "version" TEXT NOT NULL,
    "versionNumber" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShardPage_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "status" TEXT,
    "originClientRequestId" TEXT,
    "originBotProjectId" TEXT,
    "provider" TEXT NOT NULL,
    "event_id" TEXT,
    "event_name" TEXT,
    "payload" JSONB,
    "triggerRoute" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfigData_configId_key" ON "ConfigData"("configId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BotProject_githubRepoName_key" ON "BotProject"("githubRepoName");

-- CreateIndex
CREATE INDEX "ProjectPermission_botProjectId_idx" ON "ProjectPermission"("botProjectId");

-- CreateIndex
CREATE INDEX "ProjectPermission_userId_idx" ON "ProjectPermission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPermission_botProjectId_userId_key" ON "ProjectPermission"("botProjectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskInstanceMeta_originClientRequestId_key" ON "TaskInstanceMeta"("originClientRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageAnalytics_id_key" ON "UsageAnalytics"("id");

-- CreateIndex
CREATE UNIQUE INDEX "UsageAnalytics_matchId_key" ON "UsageAnalytics"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientDeployment_name_key" ON "ClientDeployment"("name");

-- CreateIndex
CREATE INDEX "WhatsAppVerification_clientSecretId_code_idx" ON "WhatsAppVerification"("clientSecretId", "code");

-- CreateIndex
CREATE INDEX "WhatsAppVerification_userId_idx" ON "WhatsAppVerification"("userId");

-- CreateIndex
CREATE INDEX "WhatsAppVerification_clientSecretId_idx" ON "WhatsAppVerification"("clientSecretId");

-- CreateIndex
CREATE INDEX "WhatsAppVerification_slug_idx" ON "WhatsAppVerification"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ShardPage_slug_key" ON "ShardPage"("slug");

-- AddForeignKey
ALTER TABLE "ChatUIMessage" ADD CONSTRAINT "ChatUIMessage_minionId_fkey" FOREIGN KEY ("minionId") REFERENCES "FoxTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatUIMessage" ADD CONSTRAINT "ChatUIMessage_originClientRequestId_fkey" FOREIGN KEY ("originClientRequestId") REFERENCES "ClientRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPermission" ADD CONSTRAINT "ProjectPermission_botProjectId_fkey" FOREIGN KEY ("botProjectId") REFERENCES "BotProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPermission" ADD CONSTRAINT "ProjectPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "ShardPage" ADD CONSTRAINT "ShardPage_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
