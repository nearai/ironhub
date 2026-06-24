-- CreateTable
CREATE TABLE "private_artifact" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "description" TEXT,
    "source_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "private_artifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "private_artifact_organization_id_idx" ON "private_artifact"("organization_id");

-- CreateIndex
CREATE INDEX "private_artifact_organization_id_visibility_idx" ON "private_artifact"("organization_id", "visibility");

-- CreateIndex
CREATE UNIQUE INDEX "private_artifact_organization_id_name_version_key" ON "private_artifact"("organization_id", "name", "version");

-- AddForeignKey
ALTER TABLE "private_artifact" ADD CONSTRAINT "private_artifact_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_artifact" ADD CONSTRAINT "private_artifact_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
