/*
  Warnings:

  - You are about to drop the column `indentityTeamId` on the `ClientSecret` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ClientSecret" DROP COLUMN "indentityTeamId",
ADD COLUMN     "identityTeamId" TEXT;
