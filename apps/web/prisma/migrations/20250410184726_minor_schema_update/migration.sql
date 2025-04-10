/*
  Warnings:

  - Made the column `githubRepoBranch` on table `BotProject` required. This step will fail if there are existing NULL values in that column.
  - Made the column `templateVersion` on table `BotProject` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "BotProject" ALTER COLUMN "githubRepoBranch" SET NOT NULL,
ALTER COLUMN "templateVersion" SET NOT NULL;
