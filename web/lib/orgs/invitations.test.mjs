import assert from "node:assert/strict"
import test from "node:test"

import {
  acceptInvitation,
  cancelInvitation,
  createInvitation,
  createInvitationForIdentifier,
  listOrgInvitations,
  listPendingInvitationsForEmail,
  rejectInvitation,
} from "./invitations.ts"

/**
 * Minimal in-memory fake matching the subset of the Prisma Client API used
 * by lib/orgs/invitations.ts, including the compare-and-set `updateMany`
 * pattern and `member.upsert` used to make double-accept idempotent.
 */
function createFakeDb({ users = {}, membersSeed = [], nearAccounts = [] } = {}) {
  const members = new Map(membersSeed.map((m) => [m.id, m]))
  const invitations = new Map()
  const sessions = new Map()

  function userFor(userId) {
    return users[userId] ?? { id: userId, name: userId, email: `${userId}@example.com` }
  }

  function matchesEmailFilter(actualEmail, filter) {
    if (filter === undefined) return true
    if (typeof filter === "string") return actualEmail === filter
    if (typeof filter === "object" && "equals" in filter) {
      return filter.mode === "insensitive"
        ? actualEmail.toLowerCase() === filter.equals.toLowerCase()
        : actualEmail === filter.equals
    }
    return true
  }

  const memberOps = {
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
    async upsert({ where, create }) {
      const key = where.organizationId_userId
      const existing = Array.from(members.values()).find(
        (m) => m.organizationId === key.organizationId && m.userId === key.userId
      )
      if (existing) return existing
      members.set(create.id, { ...create })
      return create
    },
  }

  const invitationOps = {
    async findMany({ where, include }) {
      let list = Array.from(invitations.values())
      if (where?.organizationId !== undefined) {
        list = list.filter((i) => i.organizationId === where.organizationId)
      }
      if (where?.status !== undefined) {
        list = list.filter((i) => i.status === where.status)
      }
      if (where?.expiresAt?.gt !== undefined) {
        list = list.filter((i) => i.expiresAt > where.expiresAt.gt)
      }
      if (where?.email !== undefined) {
        list = list.filter((i) => matchesEmailFilter(i.email, where.email))
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
    async findUniqueOrThrow({ where }) {
      const found = invitations.get(where.id)
      if (!found) throw new Error("not found")
      return found
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
    async updateMany({ where, data }) {
      const target = invitations.get(where.id)
      if (!target || (where.status !== undefined && target.status !== where.status)) {
        return { count: 0 }
      }
      Object.assign(target, data)
      return { count: 1 }
    },
  }

  const sessionOps = {
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
  }

  const nearAccountOps = {
    async findFirst({ where, include }) {
      const account =
        nearAccounts.find((a) => a.accountId === where.accountId) ?? null
      if (!account) return null
      return include?.user ? { ...account, user: userFor(account.userId) } : account
    },
  }

  const userOps = {
    async findMany({ where, select }) {
      const wanted = new Set(where?.email?.in ?? [])
      return Object.values(users)
        .filter((u) => wanted.has(u.email))
        .map((u) => {
          if (!select?.nearAccounts) return u
          const owned = nearAccounts.filter((a) => a.userId === u.id)
          return { ...u, nearAccounts: owned.slice(0, 1) }
        })
    },
  }

  const db = {
    member: memberOps,
    invitation: invitationOps,
    nearAccount: nearAccountOps,
    user: userOps,
    session: sessionOps,
    async $transaction(fn) {
      return fn(db)
    },
    __seed: { members, invitations, sessions },
  }

  return db
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
  // Stored normalized (lowercased), not as typed by the inviter.
  assert.equal(invitation.email, "dev@example.com")

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
    email: "dev@example.com",
    role: "member",
    status: "pending",
    expiresAt: new Date(Date.now() + 100000),
    createdAt: new Date(),
    inviterId: "owner1",
  })

  const pending = await listPendingInvitationsForEmail("Dev@Example.com", db)
  assert.equal(pending.length, 1)
  assert.equal(pending[0].id, "i2")
})

test("accept requires a matching email and creates membership; wrong user gets 403", async () => {
  const db = createFakeDb({ membersSeed: seedOwner("org1") })
  const invitation = await createInvitation("org1", "owner1", "dev@example.com", "admin", db)

  await assert.rejects(
    () => acceptInvitation(invitation.id, "someone-else", "someone@example.com", db),
    (err) => err instanceof Response && err.status === 403
  )

  const result = await acceptInvitation(invitation.id, "dev1", "DEV@example.com", db)
  assert.equal(result.invitation.status, "accepted")
  assert.equal(result.organizationId, "org1")

  const members = await db.member.findMany({ where: { organizationId: "org1" } })
  const newMember = members.find((m) => m.userId === "dev1")
  assert.ok(newMember)
  assert.equal(newMember.role, "admin")
})

test("double-accept is idempotent: second call sees the invitation is no longer pending", async () => {
  const db = createFakeDb({ membersSeed: seedOwner("org1") })
  const invitation = await createInvitation("org1", "owner1", "dev@example.com", "member", db)

  await acceptInvitation(invitation.id, "dev1", "dev@example.com", db)

  await assert.rejects(
    () => acceptInvitation(invitation.id, "dev1", "dev@example.com", db),
    (err) => err instanceof Response && err.status === 410
  )

  const members = await db.member.findMany({ where: { organizationId: "org1" } })
  assert.equal(members.filter((m) => m.userId === "dev1").length, 1)
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
    () => acceptInvitation("i1", "dev1", "dev@example.com", db),
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

test("reject also rejects expired invitations with 410", async () => {
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

  await assert.rejects(
    () => rejectInvitation("i1", "dev@example.com", db),
    (err) => err instanceof Response && err.status === 410
  )
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

test("listOrgInvitations requires owner/admin and derives an 'expired' display status", async () => {
  const db = createFakeDb({
    membersSeed: [
      ...seedOwner("org1"),
      { id: "m2", organizationId: "org1", userId: "member1", role: "member", createdAt: new Date() },
    ],
  })
  await createInvitation("org1", "owner1", "dev@example.com", "member", db)
  db.__seed.invitations.set("i-expired", {
    id: "i-expired",
    organizationId: "org1",
    email: "old@example.com",
    role: "member",
    status: "pending",
    expiresAt: new Date(Date.now() - 1000),
    createdAt: new Date(),
    inviterId: "owner1",
  })

  await assert.rejects(
    () => listOrgInvitations("org1", "member1", db),
    (err) => err instanceof Response && err.status === 403
  )

  const list = await listOrgInvitations("org1", "owner1", db)
  assert.equal(list.length, 2)
  const expired = list.find((i) => i.id === "i-expired")
  assert.equal(expired.displayStatus, "expired")
  const active = list.find((i) => i.id !== "i-expired")
  assert.equal(active.displayStatus, "pending")
})

test("invite by NEAR account reuses the address of an account that has signed in", async () => {
  // Sub-accounts get a random temp-… address on sign-in, so the stored one is
  // the only way to reach them — deriving would address nobody.
  const db = createFakeDb({
    membersSeed: seedOwner("org1"),
    users: {
      u2: { id: "u2", name: "Dev", email: "temp-9f2c1a2b@http://localhost:3000" },
    },
    nearAccounts: [{ accountId: "dev.alice.near", network: "mainnet", userId: "u2" }],
  })

  const invitation = await createInvitationForIdentifier(
    "org1",
    "owner1",
    "  Dev.Alice.NEAR ",
    "member",
    db
  )

  assert.equal(invitation.email, "temp-9f2c1a2b@http://localhost:3000")
})

test("invite by a top-level .near account that has never signed in derives its address", async () => {
  const db = createFakeDb({ membersSeed: seedOwner("org1") })

  const invitation = await createInvitationForIdentifier(
    "org1",
    "owner1",
    "alice.near",
    "member",
    db
  )

  assert.equal(invitation.email, "alice@near.email")
  assert.equal(invitation.status, "pending")
})

test("invite by an underivable NEAR account that has never signed in is refused", async () => {
  const db = createFakeDb({ membersSeed: seedOwner("org1") })

  await assert.rejects(
    () =>
      createInvitationForIdentifier("org1", "owner1", "dev.alice.near", "member", db),
    (err) => err instanceof Response && err.status === 404
  )
})

test("invite by identifier still accepts a plain email address", async () => {
  const db = createFakeDb({ membersSeed: seedOwner("org1") })

  const invitation = await createInvitationForIdentifier(
    "org1",
    "owner1",
    "  Dev@Example.com ",
    "member",
    db
  )

  assert.equal(invitation.email, "dev@example.com")
})

test("invite by identifier rejects a non-member before resolving the account", async () => {
  // Resolution must never run for someone without permission, or the endpoint
  // becomes a probe for which NEAR accounts have signed in here.
  const db = createFakeDb({
    membersSeed: [
      { id: "m1", organizationId: "org1", userId: "member1", role: "member", createdAt: new Date() },
    ],
    nearAccounts: [{ accountId: "alice.near", network: "mainnet", userId: "u2" }],
  })

  await assert.rejects(
    () => createInvitationForIdentifier("org1", "member1", "alice.near", "member", db),
    (err) => err instanceof Response && err.status === 403
  )
})

test("invite by identifier rejects something that is neither an email nor an account id", async () => {
  const db = createFakeDb({ membersSeed: seedOwner("org1") })

  await assert.rejects(
    () => createInvitationForIdentifier("org1", "owner1", "alice", "member", db),
    (err) => err instanceof Response && err.status === 400
  )
})

test("a .tg account that has signed in can be invited", async () => {
  const db = createFakeDb({
    membersSeed: seedOwner("org1"),
    users: {
      u3: { id: "u3", name: "efiz", email: "temp-4b7d0e11@http://localhost:3000" },
    },
    nearAccounts: [{ accountId: "efiz.tg", network: "mainnet", userId: "u3" }],
  })

  const invitation = await createInvitationForIdentifier(
    "org1",
    "owner1",
    "efiz.tg",
    "member",
    db
  )

  assert.equal(invitation.email, "temp-4b7d0e11@http://localhost:3000")
})

test("a sub-account's placeholder address is never rejected as an invalid email", async () => {
  // better-near-auth builds it as `temp-<hex>@<BETTER_AUTH_URL>`, which is not
  // a syntactically valid address — validating it is what used to break this.
  const db = createFakeDb({
    membersSeed: seedOwner("org1"),
    users: {
      u4: { id: "u4", name: "work.efiz.near", email: "temp-1a2b3c4d@http://localhost:3000" },
    },
    nearAccounts: [
      { accountId: "work.efiz.near", network: "mainnet", userId: "u4" },
    ],
  })

  const invitation = await createInvitationForIdentifier(
    "org1",
    "owner1",
    "work.efiz.near",
    "member",
    db
  )

  assert.equal(invitation.email, "temp-1a2b3c4d@http://localhost:3000")
  assert.equal(invitation.status, "pending")

  // And the same account cannot be invited twice.
  await assert.rejects(
    () =>
      createInvitationForIdentifier("org1", "owner1", "work.efiz.near", "member", db),
    (err) => err instanceof Response && err.status === 409
  )
})

test("listOrgInvitations reports the NEAR account id behind a placeholder address", async () => {
  const db = createFakeDb({
    membersSeed: seedOwner("org1"),
    users: {
      u4: { id: "u4", name: "work.efiz.near", email: "temp-1a2b3c4d@http://localhost:3000" },
    },
    nearAccounts: [
      { accountId: "work.efiz.near", network: "mainnet", userId: "u4" },
    ],
  })
  await createInvitationForIdentifier(
    "org1",
    "owner1",
    "work.efiz.near",
    "member",
    db
  )
  await createInvitation("org1", "owner1", "dev@example.com", "member", db)

  const list = await listOrgInvitations("org1", "owner1", db)
  const wallet = list.find((i) => i.email.startsWith("temp-"))
  const mailbox = list.find((i) => i.email === "dev@example.com")

  assert.equal(wallet.accountId, "work.efiz.near")
  assert.equal(mailbox.accountId, null)
})

test("a plainly malformed identifier is still rejected", async () => {
  const db = createFakeDb({ membersSeed: seedOwner("org1") })

  await assert.rejects(
    () => createInvitationForIdentifier("org1", "owner1", "alice", "member", db),
    (err) => err instanceof Response && err.status === 400
  )
  await assert.rejects(
    () =>
      createInvitationForIdentifier("org1", "owner1", "not an email", "member", db),
    (err) => err instanceof Response && err.status === 400
  )
})
