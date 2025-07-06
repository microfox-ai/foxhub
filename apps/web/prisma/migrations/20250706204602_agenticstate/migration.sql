-- CreateTable
CREATE TABLE "ChatAgenticState" (
    "id" TEXT NOT NULL,
    "originClientRequestId" TEXT NOT NULL,
    "state" JSONB,

    CONSTRAINT "ChatAgenticState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatAgenticState_originClientRequestId_key" ON "ChatAgenticState"("originClientRequestId");
