import assert from "node:assert/strict"
import test from "node:test"

import {
  canChangeRole,
  canManageInvitations,
  canManageMembers,
  canRemoveMember,
  isLastOwner,
  ownerCount,
} from "./roles.ts"

test("owner and admin can manage members/invitations, member cannot", () => {
  assert.equal(canManageMembers("owner"), true)
  assert.equal(canManageMembers("admin"), true)
  assert.equal(canManageMembers("member"), false)
  assert.equal(canManageInvitations("member"), false)
})

test("owner can remove anyone; admin cannot remove an owner; member removes no one", () => {
  assert.equal(canRemoveMember("owner", "owner"), true)
  assert.equal(canRemoveMember("owner", "admin"), true)
  assert.equal(canRemoveMember("admin", "owner"), false)
  assert.equal(canRemoveMember("admin", "member"), true)
  assert.equal(canRemoveMember("member", "member"), false)
})

test("owner can set any role; admin cannot touch owners or grant owner", () => {
  assert.equal(canChangeRole("owner", "member", "admin"), true)
  assert.equal(canChangeRole("owner", "owner", "member"), true)
  assert.equal(canChangeRole("admin", "member", "admin"), true)
  assert.equal(canChangeRole("admin", "owner", "member"), false)
  assert.equal(canChangeRole("admin", "member", "owner"), false)
  assert.equal(canChangeRole("member", "member", "admin"), false)
})

test("ownerCount and isLastOwner reflect the member list", () => {
  const members = [
    { userId: "u1", role: "owner" },
    { userId: "u2", role: "admin" },
  ]
  assert.equal(ownerCount(members), 1)
  assert.equal(isLastOwner(members, "u1"), true)
  assert.equal(isLastOwner(members, "u2"), false)

  const twoOwners = [
    { userId: "u1", role: "owner" },
    { userId: "u2", role: "owner" },
  ]
  assert.equal(isLastOwner(twoOwners, "u1"), false)
})
