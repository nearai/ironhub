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
import { MAX_ORGANIZATIONS_PER_USER } from "./limits.ts"

/**
 * Minimal in-memory fake matching the subset of the Prisma Client API used
 * by lib/orgs/service.ts, so business logic (permissions, last-owner
 * protection, active-org fallback selection) can be unit-tested without a
 * database. `$transaction` just runs the callback against the same fake
 * (no real isolation) since these tests only assert final state and error
 * paths, not concurrency.
 */
function createFakeDb() {
  const organizations = new Map()
  const members = new Map()
  const sessions = new Map()

  const memberOps = {
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
      if (where.id !== undefined) {
        list = list.filter((m) => m.id === where.id)
      }
      if (where.role !== undefined) {
        list = list.filter((m) => m.role === where.role)
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
    async count({ where }) {
      const list = await this.findMany({ where })
      return list.length
    },
    async create({ data }) {
      members.set(data.id, { ...data })
      return data
    },
    async deleteMany({ where }) {
      const list = await this.findMany({ where })
      for (const m of list) members.delete(m.id)
      return { count: list.length }
    },
    async updateMany({ where, data }) {
      const list = await this.findMany({ where })
      for (const m of list) {
        const entry = members.get(m.id)
        Object.assign(entry, data)
      }
      return { count: list.length }
    },
  }

  const sessionOps = {
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
    async updateMany({ where, data }) {
      let list = Array.from(sessions.values())
      if (where.userId !== undefined) list = list.filter((s) => s.userId === where.userId)
      if (where.activeOrganizationId !== undefined) {
        list = list.filter((s) => s.activeOrganizationId === where.activeOrganizationId)
      }
      for (const s of list) Object.assign(s, data)
      return { count: list.length }
    },
  }

  const db = {
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
    member: memberOps,
    session: sessionOps,
    async $transaction(fn) {
      return fn(db)
    },
    __seed: { organizations, members, sessions },
  }

  return db
}

test("createOrganization creates the org and makes the creator its owner", async () => {
  const db = createFakeDb()
  const org = await createOrganization("u1", "Acme", db)
  assert.equal(org.name, "Acme")
  const members = await db.member.findMany({ where: { organizationId: org.id } })
  assert.equal(members.length, 1)
  assert.equal(members[0].role, "owner")
})

test(`createOrganization refuses past ${MAX_ORGANIZATIONS_PER_USER} owned organizations`, async () => {
  const db = createFakeDb()
  for (let i = 0; i < MAX_ORGANIZATIONS_PER_USER; i += 1) {
    await createOrganization("u1", `Org ${i}`, db)
  }

  const error = await createOrganization("u1", "One too many", db).catch((e) => e)
  assert.ok(error instanceof Response)
  assert.equal(error.status, 403)

  const owned = await db.member.findMany({ where: { userId: "u1" } })
  assert.equal(owned.length, MAX_ORGANIZATIONS_PER_USER)
})

test("memberships the user did not create do not consume their org quota", async () => {
  const db = createFakeDb()
  const host = await createOrganization("host", "Host org", db)
  // Joined as a plain member, e.g. by accepting an invitation.
  await db.member.create({
    data: {
      id: "m-joined",
      organizationId: host.id,
      userId: "u1",
      role: "member",
      createdAt: new Date(),
    },
  })
  for (let i = 0; i < MAX_ORGANIZATIONS_PER_USER - 1; i += 1) {
    await createOrganization("u1", `Org ${i}`, db)
  }

  const org = await createOrganization("u1", "Still allowed", db)
  assert.equal(org.name, "Still allowed")
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

test("setActiveOrganization verifies membership but does not write the session row (route/BetterAuth owns that)", async () => {
  const db = createFakeDb()
  const org = await createOrganization("owner1", "Acme", db)

  await assert.rejects(
    () => setActiveOrganization("intruder", org.id, db),
    (err) => err instanceof Response && err.status === 403
  )

  const result = await setActiveOrganization("owner1", org.id, db)
  assert.equal(result, org.id)
})

test("last owner cannot leave the organization", async () => {
  const db = createFakeDb()
  const org = await createOrganization("owner1", "Acme", db)

  await assert.rejects(
    () => leaveOrganization(org.id, "owner1", org.id, db),
    (err) => err instanceof Response && err.status === 409
  )
})

test("leaving a non-active organization does not request an active-org switch", async () => {
  const db = createFakeDb()
  const org1 = await createOrganization("u1", "Personal", db)
  const org2 = await createOrganization("u1", "Team", db)
  await db.member.create({
    data: { id: "m-co-owner", organizationId: org2.id, userId: "u2", role: "owner", createdAt: new Date() },
  })

  const result = await leaveOrganization(org2.id, "u1", org1.id, db)
  assert.equal(result.wasActive, false)

  const members = await db.member.findMany({ where: { organizationId: org2.id } })
  assert.equal(members.some((m) => m.userId === "u1"), false)
})

test("leaving the active organization returns a fallback for the route to switch to", async () => {
  const db = createFakeDb()
  const org1 = await createOrganization("u1", "Personal", db)
  const org2 = await createOrganization("u1", "Team", db)
  // Add a co-owner so u1 leaving org2 doesn't trip last-owner protection.
  await db.member.create({
    data: { id: "m-co-owner", organizationId: org2.id, userId: "u2", role: "owner", createdAt: new Date() },
  })

  const result = await leaveOrganization(org2.id, "u1", org2.id, db)
  assert.equal(result.wasActive, true)
  assert.equal(result.fallbackOrganizationId, org1.id)
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

test("removeMember clears the removed user's stale active-org session pointer", async () => {
  const db = createFakeDb()
  const org = await createOrganization("owner1", "Acme", db)
  await db.member.create({
    data: { id: "m2", organizationId: org.id, userId: "member1", role: "member", createdAt: new Date() },
  })
  db.__seed.sessions.set("s1", { id: "s1", userId: "member1", activeOrganizationId: org.id })

  await removeMember(org.id, "owner1", "member1", db)

  const session = await db.session.findUnique({ where: { id: "s1" } })
  assert.equal(session.activeOrganizationId, null)
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
