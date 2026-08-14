-- CreateIndex
CREATE UNIQUE INDEX "member_organization_id_user_id_key" ON "member"("organization_id", "user_id");
