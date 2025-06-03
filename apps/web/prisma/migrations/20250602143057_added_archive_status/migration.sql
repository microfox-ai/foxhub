-- AlterTable
ALTER TABLE "BotProject" ADD COLUMN     "archiveStatus" TEXT;

-- AlterTable
ALTER TABLE "ClientRequest" ADD COLUMN     "archiveStatus" TEXT;

-- AlterTable
ALTER TABLE "ShardPage" ADD COLUMN     "likeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;
