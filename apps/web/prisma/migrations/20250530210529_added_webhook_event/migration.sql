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

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);
