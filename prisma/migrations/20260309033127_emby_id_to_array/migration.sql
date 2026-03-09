/*
  Warnings:

  - The `emby_id` column on the `Actress` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropIndex
DROP INDEX "Actress_emby_id_key";

-- AlterTable
ALTER TABLE "Actress" DROP COLUMN "emby_id",
ADD COLUMN     "emby_id" TEXT[];
