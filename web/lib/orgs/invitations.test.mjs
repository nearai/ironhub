import assert from "node:assert/strict"
import test from "node:test"

import {
  acceptInvitation,
  cancelInvitation,
  createInvitation,
  listOrgInvitations,
  listPendingInvitationsForEmail,
  rejectInvitation,
} from "./invitations.ts"

/**
 * Minimal in-memory fake matching the subset of the Prisma Client API used
 * by lib/orgs/invitations.ts.
 */
function createFakeDb({ users = {}, membersSeed = [] } = {}) {
  const members = new Map(membersSeed.map((m) => [m.id, m]))
  const invitations = new Map()
  const sessions = new Map()

  function userFor(userId) {
    return users[userId] ?? { id: userId, name: userId, email: `${userId}@example.com` }
  }

  return {
    member: {
      async findMany({ where, include }) {
        let list = Array.from(members.values())
        if (where.organizationId !== undefined) {
          list = list.filter((m) => m.organizationId === where.organizationId)
        }
        if (where.userId !== undefined) {
          list = list.filter((m) => m.userId === where.userId)
        }
        if (include?.user) {
          return list.map((m) => ({ ...m, user: userFor(m.userId) }))
        }
        return list
      },
      async findFirst({ where }) {
        const list = await this.findMany({ where })
        return list[0] ?? null
      },
      async create({ data }) {
        members.set(data.id, { ...data })
        return data
      },
    },
    invitation: {
      async findMany({ where, include }) {
        let list = Array.from(invitations.values())
        if (where?.organizationId !== undefined) {
          list = list.filter((i) => i.organizationId === where.organizationId)
        }
        if (where?.status !== undefined) {
          list = list.filter((i) => i.status === where.status)
        }
        list.sort((a, b) => b.createdAt - a.createdAt)
        if (include?.inviter) {
          return list.map((i) => ({ ...i, inviter: userFor(i.inviterId) }))
        }
        if (include?.organization) {
          return list.map((i) => ({
            ...i,
            organization: { id: i.organizationId, name: `org-${i.organizationId}` },
            inviter: userFor(i.inviterId),
          }))
        }
        return list
      },
      async findUnique({ where }) {
        return invitations.get(where.id) ?? null
      },
      async create({ data }) {
        invitations.set(data.id, { ...data })
        return data
      },
      async update({ where, data }) {
        const entry = invitations.get(where.id)
        Object.assign(entry, data)
        return entry
      },
    },
    session: {
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
    __seed: { members, invitations, sessions },
  }
}

function seedOwner(orgId, ownerId = "owner1") {
  return [
    { id: "m1", organizationId: orgId, userId: ownerId, role: "owner", createdAt: new Date() },
  ]
}

test("member cannot create an invitation", async () => {
  const db = createFakeDb({
    membersSeed: [
      { id: "m1", organizationId: "org1", userId: "member1", role: "member", createdAt: new Date() },
    ],
  })

  await assert.rejects(
    () => createInvitation("org1", "member1", "dev@example.com", "member", db),
    (err) => err instanceof Response && err.status === 403
  )
})

test("admin can create an invitation; duplicate pending invitation is rejected", async () => {
  const db = createFakeDb({
    membersSeed: [
      { id: "m1", organizationId: "org1", userId: "admin1", role: "admin", createdAt: new Date() },
    ],
  })

  const invitation = await createInvitation("org1", "admin1", "Dev@Example.com", "member", db)
  assert.equal(invitation.status, "pending")
  assert.equal(invitation.role, "member")

  await assert.rejects(
    () => createInvitation("org1", "admin1", "dev@example.com", "member", db),
    (err) => err instanceof Response && err.status === 409
  )
})

test("inviting an email that already belongs to a member is rejected", async () => {
  const db = createFakeDb({
    users: { existing: { id: "existing", name: "Existing", email: "existing@example.com" } },
    membersSeed: [
      { id: "m1", organizationId: "org1", userId: "owner1", role: "owner", createdAt: new Date() },
      { id: "m2", organizationId: "org1", userId: "existing", role: "member", createdAt: new Date() },
    ],
  })

  await assert.rejects(
    () => createInvitation("org1", "owner1", "existing@example.com", "member", db),
    (err) => err instanceof Response && err.status === 409
  )
})

test("expired invitations are excluded from the pending-by-email listing", async () => {
  const db = createFakeDb()
  db.__seed.invitations.set("i1", {
    id: "i1",
    organizationId: "org1",
    email: "dev@example.com",
    role: "member",
    status: "pending",
    expiresAt: new Date(Date.now() - 1000),
    createdAt: new Date(),
    inviterId: "owner1",
  })
  db.__seed.invitations.set("i2", {
    id: "i2",
    organizationId: "org1",
    email: "Dev@Example.com",
    role: "member",
    status: "pending",
    expiresAt: new Date(Date.now() + 100000),
    createdAt: new Date(),
    inviterId: "owner1",
  })

  const pending = await listPendingInvitationsForEmail("dev@example.com", db)
  assert.equal(pending.length, 1)
  assert.equal(pending[0].id, "i2")
})

test("accept requires a matching email and creates membership; wrong user gets 403", async () => {
  const db = createFakeDb({ membersSeed: seedOwner("org1") })
  const invitation = await createInvitation("org1", "owner1", "dev@example.com", "admin", db)

  await assert.rejects(
    () => acceptInvitation(invitation.id, "someone-else", "someone@example.com", false, db),
    (err) => err instanceof Response && err.status === 403
  )

  const accepted = await acceptInvitation(invitation.id, "dev1", "DEV@example.com", false, db)
  assert.equal(accepted.status, "accepted")

  const members = await db.member.findMany({ where: { organizationId: "org1" } })
  const newMember = members.find((m) => m.userId === "dev1")
  assert.ok(newMember)
  assert.equal(newMember.role, "admin")
})

test("expired invitations cannot be accepted", async () => {
  const db = createFakeDb({ membersSeed: seedOwner("org1") })
  db.__seed.invitations.set("i1", {
    id: "i1",
    organizationId: "org1",
    email: "dev@example.com",
    role: "member",
    status: "pending",
    expiresAt: new Date(Date.now() - 1000),
    createdAt: new Date(),
    inviterId: "owner1",
  })

  await assert.rejects(
    () => acceptInvitation("i1", "dev1", "dev@example.com", false, db),
    (err) => err instanceof Response && err.status === 410
  )
})

test("reject marks the invitation rejected without creating membership", async () => {
  const db = createFakeDb({ membersSeed: seedOwner("org1") })
  const invitation = await createInvitation("org1", "owner1", "dev@example.com", "member", db)

  const rejected = await rejectInvitation(invitation.id, "dev@example.com", db)
  assert.equal(rejected.status, "rejected")

  const members = await db.member.findMany({ where: { organizationId: "org1" } })
  assert.equal(members.some((m) => m.userId !== "owner1"), false)
})

test("cancel requires owner/admin on the inviter side", async () => {
  const db = createFakeDb({
    membersSeed: [
      ...seedOwner("org1"),
      { id: "m2", organizationId: "org1", userId: "member1", role: "member", createdAt: new Date() },
    ],
  })
  const invitation = await createInvitation("org1", "owner1", "dev@example.com", "member", db)

  await assert.rejects(
    () => cancelInvitation(invitation.id, "member1", db),
    (err) => err instanceof Response && err.status === 403
  )

  const canceled = await cancelInvitation(invitation.id, "owner1", db)
  assert.equal(canceled.status, "canceled")
})

test("listOrgInvitations requires owner/admin", async () => {
  const db = createFakeDb({
    membersSeed: [
      ...seedOwner("org1"),
      { id: "m2", organizationId: "org1", userId: "member1", role: "member", createdAt: new Date() },
    ],
  })
  await createInvitation("org1", "owner1", "dev@example.com", "member", db)

  await assert.rejects(
    () => listOrgInvitations("org1", "member1", db),
    (err) => err instanceof Response && err.status === 403
  )

  const list = await listOrgInvitations("org1", "owner1", db)
  assert.equal(list.length, 1)
})
