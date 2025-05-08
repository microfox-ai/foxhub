/*
  Warnings:

  - Added the required column `clientRequestId` to the `ShardPage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ShardPage" ADD COLUMN     "clientRequestId" TEXT NOT NULL;
