/*
  Warnings:

  - You are about to drop the column `status` on the `Actress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Actress" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "Tier" ADD COLUMN     "status" TEXT NOT NULL DEFAULT '现役';
