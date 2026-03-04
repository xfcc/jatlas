/*
  Warnings:

  - You are about to drop the column `external_id` on the `Actress` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[emby_id]` on the table `Actress` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Actress_external_id_key";

-- AlterTable
ALTER TABLE "Actress" DROP COLUMN "external_id",
ADD COLUMN     "emby_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Actress_emby_id_key" ON "Actress"("emby_id");
