import assert from "node:assert/strict"
import test from "node:test"

import {
  changeMemberRole,
  createOrganization,
  leaveOrganization,
  listMembers,
  listMyOrganizations,
  removeMember,
  renameOrganization,
  setActiveOrganization,
} from "./service.ts"

/**
 * Minimal in-memory fake matching the subset of the Prisma Client API used
 * by lib/orgs/service.ts, so business logic (permissions, last-owner
 * protection, active-org fallback) can be unit-tested without a database.
 */
function createFakeDb() {
  const organizations = new Map()
  const members = new Map()
  const sessions = new Map()

  return {
    organization: {
      async create({ data }) {
        const org = { id: data.id, name: data.name, slug: data.slug }
        organizations.set(org.id, org)
        if (data.members?.create) {
          const m = data.members.create
          members.set(m.id, { ...m, organizationId: org.id })
        }
        return org
      },
      async update({ where, data }) {
        const org = organizations.get(where.id)
        Object.assign(org, data)
        return org
      },
    },
    member: {
      async findMany({ where, select }) {
        let list = Array.from(members.values())
        if (where.userId !== undefined) {
          if (typeof where.userId === "object" && where.userId.not !== undefined) {
            list = list.filter((m) => m.userId !== where.userId.not)
          } else {
            list = list.filter((m) => m.userId === where.userId)
          }
        }
        if (where.organizationId !== undefined) {
          if (
            typeof where.organizationId === "object" &&
            where.organizationId.not !== undefined
          ) {
            list = list.filter((m) => m.organizationId !== where.organizationId.not)
          } else {
            list = list.filter((m) => m.organizationId === where.organizationId)
          }
        }
        list.sort((a, b) => a.createdAt - b.createdAt)
        if (select) {
          return list.map((m) => {
            const picked = {}
            for (const key of Object.keys(select)) picked[key] = m[key]
            return picked
          })
        }
        return list.map((m) => ({
          ...m,
          organization: organizations.get(m.organizationId),
          user: { id: m.userId, name: m.userId, email: `${m.userId}@example.com` },
        }))
      },
      async findFirst({ where }) {
        const list = await this.findMany({ where })
        return list[0] ?? null
      },
      async create({ data }) {
        members.set(data.id, { ...data })
        return data
      },
      async update({ where, data }) {
        const entry = Array.from(members.values()).find((m) => m.id === where.id)
        Object.assign(entry, data)
        return entry
      },
      async delete({ where }) {
        const entry = Array.from(members.values()).find((m) => m.id === where.id)
        members.delete(entry.id)
        return entry
      },
    },
    session: {
      async findUnique({ where }) {
        return sessions.get(where.id) ?? null
      },
      async findFirst({ where }) {
        return (
          Array.from(sessions.values()).find((s) => s.userId === where.userId) ?? null
        )
      },
      async update({ where, data }) {
        const session = sessions.get(where.id)
        Object.assign(session, data)
        return session
      },
    },
    __seed: { organizations, members, sessions },
  }
}

test("createOrganization creates the org and makes the creator its owner", async () => {
  const db = createFakeDb()
  const org = await createOrganization("u1", "Acme", db)
  assert.equal(org.name, "Acme")
  const members = await db.member.findMany({ where: { organizationId: org.id } })
  assert.equal(members.length, 1)
  assert.equal(members[0].role, "owner")
})

test("listMyOrganizations returns role alongside org info", async () => {
  const db = createFakeDb()
  const org = await createOrganization("u1", "Acme", db)
  const list = await listMyOrganizations("u1", db)
  assert.deepEqual(list, [{ id: org.id, name: "Acme", slug: org.slug, role: "owner" }])
})

test("renameOrganization requires the owner role", async () => {
  const db = createFakeDb()
  const org = await createOrganization("owner1", "Acme", db)
  await db.member.create({
    data: { id: "m2", organizationId: org.id, userId: "member1", role: "member", createdAt: new Date() },
  })

  await assert.rejects(
    () => renameOrganization(org.id, "member1", "New Name", db),
    (err) => err instanceof Response && err.status === 403
  )

  const renamed = await renameOrganization(org.id, "owner1", "New Name", db)
  assert.equal(renamed.name, "New Name")
})

test("setActiveOrganization rejects non-members with 403", async () => {
  const db = createFakeDb()
  const org = await createOrganization("owner1", "Acme", db)
  db.__seed.sessions.set("s1", { id: "s1", userId: "intruder", activeOrganizationId: null })

  await assert.rejects(
    () => setActiveOrganization("intruder", "s1", org.id, db),
    (err) => err instanceof Response && err.status === 403
  )
})

test("last owner cannot leave the organization", async () => {
  const db = createFakeDb()
  const org = await createOrganization("owner1", "Acme", db)
  db.__seed.sessions.set("s1", { id: "s1", userId: "owner1", activeOrganizationId: org.id })

  await assert.rejects(
    () => leaveOrganization(org.id, "owner1", "s1", db),
    (err) => err instanceof Response && err.status === 409
  )
})

test("leaving the active organization falls back to another membership", async () => {
  const db = createFakeDb()
  const org1 = await createOrganization("u1", "Personal", db)
  const org2 = await createOrganization("u1", "Team", db)
  // Add a co-owner so u1 leaving org2 doesn't trip last-owner protection.
  await db.member.create({
    data: { id: "m-co-owner", organizationId: org2.id, userId: "u2", role: "owner", createdAt: new Date() },
  })
  db.__seed.sessions.set("s1", { id: "s1", userId: "u1", activeOrganizationId: org2.id })

  await leaveOrganization(org2.id, "u1", "s1", db)

  const session = await db.session.findUnique({ where: { id: "s1" } })
  assert.equal(session.activeOrganizationId, org1.id)
})

test("admin cannot remove an owner but can remove a member; last owner is protected", async () => {
  const db = createFakeDb()
  const org = await createOrganization("owner1", "Acme", db)
  await db.member.create({
    data: { id: "m2", organizationId: org.id, userId: "admin1", role: "admin", createdAt: new Date() },
  })
  await db.member.create({
    data: { id: "m3", organizationId: org.id, userId: "member1", role: "member", createdAt: new Date() },
  })

  await assert.rejects(
    () => removeMember(org.id, "admin1", "owner1", db),
    (err) => err instanceof Response && err.status === 403
  )

  await removeMember(org.id, "admin1", "member1", db)
  const remaining = await db.member.findMany({ where: { organizationId: org.id } })
  assert.equal(remaining.some((m) => m.userId === "member1"), false)

  await assert.rejects(
    () => removeMember(org.id, "owner1", "owner1", db),
    (err) => err instanceof Response && err.status === 409
  )
})

test("changeMemberRole enforces the permission matrix and last-owner protection", async () => {
  const db = createFakeDb()
  const org = await createOrganization("owner1", "Acme", db)
  await db.member.create({
    data: { id: "m2", organizationId: org.id, userId: "admin1", role: "admin", createdAt: new Date() },
  })

  // admin cannot grant owner
  await assert.rejects(
    () => changeMemberRole(org.id, "admin1", "admin1", "owner", db),
    (err) => err instanceof Response && err.status === 403
  )

  // admin cannot demote/touch an owner
  await assert.rejects(
    () => changeMemberRole(org.id, "admin1", "owner1", "member", db),
    (err) => err instanceof Response && err.status === 403
  )

  // owner cannot demote the only owner
  await assert.rejects(
    () => changeMemberRole(org.id, "owner1", "owner1", "member", db),
    (err) => err instanceof Response && err.status === 409
  )

  const updated = await changeMemberRole(org.id, "owner1", "admin1", "member", db)
  assert.equal(updated.role, "member")
})

test("listMembers requires membership in the organization", async () => {
  const db = createFakeDb()
  const org = await createOrganization("owner1", "Acme", db)

  await assert.rejects(
    () => listMembers(org.id, "stranger", db),
    (err) => err instanceof Response && err.status === 403
  )

  const members = await listMembers(org.id, "owner1", db)
  assert.equal(members.length, 1)
})
