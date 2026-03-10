-- CreateEnum
CREATE TYPE "AssetActionType" AS ENUM ('CREATE', 'DELETE', 'UPDATE');

-- CreateTable
CREATE TABLE "AssetLog" (
    "id" SERIAL NOT NULL,
    "actress_id" INTEGER NOT NULL,
    "actress_name" TEXT NOT NULL,
    "action_type" "AssetActionType" NOT NULL,
    "video_delta" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetLog_pkey" PRIMARY KEY ("id")
);
