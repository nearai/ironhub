-- Greenfield: no production data exists for private_artifact_content, so this
-- drops `bytes` outright instead of migrating it.
ALTER TABLE "private_artifact_content" DROP COLUMN "bytes";
ALTER TABLE "private_artifact_content" ADD COLUMN "storage_key" TEXT NOT NULL;
