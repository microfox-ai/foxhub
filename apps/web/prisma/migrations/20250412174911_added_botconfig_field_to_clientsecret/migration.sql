-- AlterTable
ALTER TABLE "ClientSecret" ADD COLUMN     "botConfig" JSONB[] DEFAULT ARRAY[]::JSONB[],
ALTER COLUMN "status" SET DEFAULT 'FILLED';
