-- CreateTable
CREATE TABLE "private_artifact_asset" (
    "id" TEXT NOT NULL,
    "artifact_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "private_artifact_asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "private_artifact_asset_artifact_id_idx" ON "private_artifact_asset"("artifact_id");

-- CreateIndex
CREATE UNIQUE INDEX "private_artifact_asset_artifact_id_kind_path_key" ON "private_artifact_asset"("artifact_id", "kind", "path");

-- AddForeignKey
ALTER TABLE "private_artifact_asset" ADD CONSTRAINT "private_artifact_asset_artifact_id_fkey" FOREIGN KEY ("artifact_id") REFERENCES "private_artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
