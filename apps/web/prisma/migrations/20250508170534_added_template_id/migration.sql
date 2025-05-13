-- AlterTable
ALTER TABLE "ClientSecret" ADD COLUMN     "templateId" TEXT;

-- AlterTable
ALTER TABLE "ClientSecretTemplate" ADD COLUMN     "imageUrl" TEXT;
