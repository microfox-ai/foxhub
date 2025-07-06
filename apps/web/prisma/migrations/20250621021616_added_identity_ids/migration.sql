-- AlterTable
ALTER TABLE "ClientSecret" ADD COLUMN     "identityOrgId" TEXT,
ADD COLUMN     "identityUserId" TEXT,
ADD COLUMN     "indentityTeamId" TEXT;
