-- AlterTable
ALTER TABLE "ClientSecret" ADD COLUMN     "isHidden" BOOLEAN;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isBetaAccess" BOOLEAN;
