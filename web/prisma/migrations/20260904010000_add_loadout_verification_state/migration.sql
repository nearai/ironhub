-- AlterTable
ALTER TABLE "private_artifact" ADD COLUMN     "needs_reverification" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verified_release_tag" TEXT;

-- No backfill, and that is the decision rather than an omission. Every
-- existing row takes a null "verified_release_tag", which reads as "never
-- verified against any upstream release" -- true of all of them, since no
-- loadout has ever been verified. The read path treats that null as a reason
-- to re-verify, so the first read of any loadout does the work rather than
-- trusting a column that was never written. Filling these in with the current
-- release would invert exactly that: it would claim a verification that never
-- happened, and the loadouts this mark exists to warn about would stay quiet.
