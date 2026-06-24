-- CreateTable
CREATE TABLE "private_artifact_content" (
    "id" TEXT NOT NULL,
    "artifact_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "sha256" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "private_artifact_content_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "private_artifact_content_artifact_id_idx" ON "private_artifact_content"("artifact_id");

-- CreateIndex
CREATE UNIQUE INDEX "private_artifact_content_artifact_id_kind_key" ON "private_artifact_content"("artifact_id", "kind");

-- AddForeignKey
ALTER TABLE "private_artifact_content" ADD CONSTRAINT "private_artifact_content_artifact_id_fkey" FOREIGN KEY ("artifact_id") REFERENCES "private_artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
