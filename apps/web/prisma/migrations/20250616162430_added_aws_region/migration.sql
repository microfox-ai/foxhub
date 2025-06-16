-- AlterTable
ALTER TABLE "BotProject" ADD COLUMN     "awsRegion" TEXT;

-- AlterTable
ALTER TABLE "ClientDeployment" ADD COLUMN     "awsRegion" TEXT;

-- AlterTable
ALTER TABLE "ClientRequest" ADD COLUMN     "awsRegion" TEXT;
