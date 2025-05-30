/*
  Warnings:

  - Added the required column `updatedAt` to the `UsageAnalytics` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UsageAnalytics" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "invocations" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT;
