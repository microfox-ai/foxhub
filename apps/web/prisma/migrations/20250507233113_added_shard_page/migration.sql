-- CreateTable
CREATE TABLE "ShardPage" (
    "id" TEXT NOT NULL,
    "taskInstanceMeta" JSONB NOT NULL,
    "clientRequestMeta" JSONB NOT NULL,
    "repoDir" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "video_url" TEXT,
    "thumbnail_url" TEXT,
    "banner_url" TEXT,
    "version" TEXT NOT NULL,
    "versionNumber" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShardPage_pkey" PRIMARY KEY ("id")
);
