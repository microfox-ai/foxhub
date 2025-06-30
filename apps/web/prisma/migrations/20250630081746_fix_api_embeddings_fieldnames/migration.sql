/*
  Warnings:

  - You are about to drop the `ApiEmbedding` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "ApiEmbedding";

-- CreateTable
CREATE TABLE "api_embeddings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "bot_project_id" TEXT,
    "origin_client_request_id" TEXT,
    "base_url" TEXT NOT NULL,
    "schema_path" TEXT,
    "endpoint_path" TEXT NOT NULL,
    "http_method" TEXT NOT NULL,
    "doc_text" TEXT NOT NULL,
    "embedding" vector(768),
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "stage" "deployment_stage" NOT NULL DEFAULT 'STAGING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_embeddings_bot_project_id_idx" ON "api_embeddings"("bot_project_id");
