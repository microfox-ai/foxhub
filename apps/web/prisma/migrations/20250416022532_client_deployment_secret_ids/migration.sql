-- AlterTable
ALTER TABLE "ClientDeployment" ADD COLUMN     "clientSecretIds" TEXT[];

-- AlterTable
ALTER TABLE "ClientSecret" ADD COLUMN     "clientDeploymentIds" TEXT[];
