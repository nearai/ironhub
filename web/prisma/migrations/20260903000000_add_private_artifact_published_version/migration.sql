-- AlterTable
ALTER TABLE "private_artifact" ADD COLUMN "published_version" TEXT;

-- Backfill. An artifact that is already published is, by definition,
-- published at the version it currently holds: there was no way to change a
-- version before this migration, so the two cannot have diverged. Without
-- this every existing published row would read as "the version has moved
-- since publish" and its stored files would stay overwritable in place --
-- exactly the state the content freeze exists to prevent.
UPDATE "private_artifact"
SET "published_version" = "version"
WHERE "status" = 'published';
