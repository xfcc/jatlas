-- CreateTable
CREATE TABLE "Actress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "video_count" INTEGER NOT NULL,
    "external_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Actress_external_id_key" ON "Actress"("external_id");
