-- CreateTable
CREATE TABLE "UserImageSourcemap" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserImageSourcemap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserImageSourcemap_userId_idx" ON "UserImageSourcemap"("userId");
