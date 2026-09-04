-- CreateTable
CREATE TABLE "loadout_member" (
    "id" TEXT NOT NULL,
    "loadout_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "artifact_id" TEXT,
    "pinned_digest" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loadout_member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loadout_member_loadout_id_idx" ON "loadout_member"("loadout_id");

-- CreateIndex
CREATE INDEX "loadout_member_artifact_id_idx" ON "loadout_member"("artifact_id");

-- CreateIndex
CREATE UNIQUE INDEX "loadout_member_loadout_id_source_kind_name_key" ON "loadout_member"("loadout_id", "source", "kind", "name");

-- AddForeignKey
ALTER TABLE "loadout_member" ADD CONSTRAINT "loadout_member_loadout_id_fkey" FOREIGN KEY ("loadout_id") REFERENCES "private_artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
-- RESTRICT, where every other foreign key onto "private_artifact" cascades.
-- Content and asset rows are parts of an artifact and are right to die with
-- it; this one is a reference held by a different artifact, and cascading
-- would empty a published loadout silently, from a deletion screen that never
-- named it. The database refuses the delete instead, so a member leaves a
-- loadout only after somebody has been told which loadout is holding it.
ALTER TABLE "loadout_member" ADD CONSTRAINT "loadout_member_artifact_id_fkey" FOREIGN KEY ("artifact_id") REFERENCES "private_artifact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
