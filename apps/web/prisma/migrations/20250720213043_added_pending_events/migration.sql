-- CreateTable
CREATE TABLE "PendingEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "botProjectId" TEXT,
    "requestId" TEXT,
    "taskId" TEXT,

    CONSTRAINT "PendingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingEvent_botProjectId_idx" ON "PendingEvent"("botProjectId");

-- CreateIndex
CREATE INDEX "PendingEvent_requestId_idx" ON "PendingEvent"("requestId");

-- CreateIndex
CREATE INDEX "PendingEvent_taskId_idx" ON "PendingEvent"("taskId");
