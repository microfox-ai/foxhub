-- CreateEnum
CREATE TYPE "deployment_stage" AS ENUM ('DEV', 'STAGING', 'PREVIEW', 'PROD');

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('pending', 'scheduled', 'progress', 'input_await', 'completed', 'failed', 'archived');

-- CreateEnum
CREATE TYPE "task_type" AS ENUM ('default', 'watcher', 'scheduled', 'stale');

-- CreateEnum
CREATE TYPE "task_priority" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "event_status" AS ENUM ('unclassified', 'classified', 'failed');

-- CreateTable
CREATE TABLE "ApiEmbedding" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "botProjectId" TEXT,
    "originClientRequestId" TEXT,
    "baseUrl" TEXT NOT NULL,
    "schemaPath" TEXT,
    "endpointPath" TEXT NOT NULL,
    "httpMethod" TEXT NOT NULL,
    "docText" TEXT NOT NULL,
    "embedding" vector(768),
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "stage" "deployment_stage" NOT NULL DEFAULT 'STAGING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "microfoxIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "providerName" TEXT,
    "providerEventId" TEXT,
    "eventType" TEXT NOT NULL,
    "status" "event_status" NOT NULL DEFAULT 'unclassified',
    "content" TEXT,
    "metadata" JSONB,
    "classificationNotes" TEXT,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "microfoxId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "name" TEXT,
    "taskType" "task_type" NOT NULL,
    "status" "task_status" NOT NULL,
    "priority" "task_priority",
    "authorizedUsers" TEXT[],
    "input" JSONB,
    "output" JSONB,
    "metadata" JSONB,
    "providerName" TEXT,
    "aiDescription" TEXT,
    "triggeringEventId" TEXT,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "parentActivityId" TEXT,
    "prevActivityId" TEXT,
    "nextActivityId" TEXT,
    "type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageId" TEXT,
    "messageContent" TEXT,
    "metadata" JSONB,
    "messageMetadata" JSONB,
    "aiGeneratedData" JSONB,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_watchers" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "microfoxId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "teamId" TEXT,
    "organizationId" TEXT,
    "matchQuery" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_watchers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiEmbedding_botProjectId_idx" ON "ApiEmbedding"("botProjectId");

-- CreateIndex
CREATE INDEX "ApiEmbedding_originClientRequestId_idx" ON "ApiEmbedding"("originClientRequestId");

-- CreateIndex
CREATE INDEX "ApiEmbedding_isPublic_idx" ON "ApiEmbedding"("isPublic");

-- CreateIndex
CREATE INDEX "ApiEmbedding_stage_idx" ON "ApiEmbedding"("stage");

-- CreateIndex
CREATE INDEX "idx_api_embeddings_embedding" ON "ApiEmbedding"("embedding");

-- CreateIndex
CREATE INDEX "events_providerEventId_idx" ON "events"("providerEventId");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "idx_events_microfox_ids" ON "events"("microfoxIds");

-- CreateIndex
CREATE INDEX "tasks_microfoxId_idx" ON "tasks"("microfoxId");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "tasks_priority_idx" ON "tasks"("priority");

-- CreateIndex
CREATE INDEX "tasks_providerName_idx" ON "tasks"("providerName");

-- CreateIndex
CREATE INDEX "tasks_scheduledFor_idx" ON "tasks"("scheduledFor");

-- CreateIndex
CREATE INDEX "tasks_triggeringEventId_idx" ON "tasks"("triggeringEventId");

-- CreateIndex
CREATE INDEX "activities_taskId_idx" ON "activities"("taskId");

-- CreateIndex
CREATE INDEX "activities_type_idx" ON "activities"("type");

-- CreateIndex
CREATE INDEX "activities_parentActivityId_idx" ON "activities"("parentActivityId");

-- CreateIndex
CREATE UNIQUE INDEX "activities_taskId_sequenceNumber_key" ON "activities"("taskId", "sequenceNumber");

-- CreateIndex
CREATE INDEX "event_watchers_taskId_idx" ON "event_watchers"("taskId");

-- CreateIndex
CREATE INDEX "idx_event_watchers_keys" ON "event_watchers"("microfoxId", "providerName", "eventType");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_triggeringEventId_fkey" FOREIGN KEY ("triggeringEventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_parentActivityId_fkey" FOREIGN KEY ("parentActivityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "event_watchers" ADD CONSTRAINT "event_watchers_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
