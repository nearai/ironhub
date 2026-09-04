import { randomUUID } from "node:crypto"

import { prisma } from "../db/index.ts"
import {
  deriveNearEmail,
  looksLikeNearAccountId,
  normalizeNearAccountId,
} from "./near-identity.ts"
import { canManageInvitations } from "./roles.ts"

type PrismaLike = typeof prisma

// Roles an invitation may grant. Deliberately excludes "owner": accepting an
// invitation must never mint an owner membership, even if an invitation row
// somehow carries role "owner" (invitation creation already rejects it, but
// the accept path re-asserts it defensively).
const INVITABLE_ROLES = ["admin", "member"] as const
type InvitableRole = (typeof INVITABLE_ROLES)[number]
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function assertEmail(email: string) {
  const trimmed = normalizeEmail(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Response("Invalid email address", { status: 400 })
  }
  return trimmed
}

async function requireMembership(
  organizationId: string,
  userId: string,
  client: PrismaLike
) {
  const member = await client.member.findFirst({
    where: { organizationId, userId },
  })

  if (!member) {
    throw new Response("Not a member of this organization", { status: 403 })
  }

  return member
}

/**
 * Resolves what an inviter typed — an email address or a NEAR account id —
 * to the email an invitation is addressed to.
 *
 * A wallet user's email is minted by better-near-auth on first sign-in, so
 * the account is looked up first and its stored address reused verbatim.
 * For anything but a top-level `<name>.near` account that address is a
 * `temp-<hex>@<app url>` placeholder — an internal key rather than a mailbox,
 * so it must never be validated as an email. Only when the account has never
 * signed in does this fall back to deriving the address.
 */
export async function resolveInviteeEmail(
  identifier: string,
  client: PrismaLike = prisma
) {
  const trimmed = identifier.trim()
  if (!trimmed) {
    throw new Response("Enter an email address or a NEAR account", {
      status: 400,
    })
  }

  if (trimmed.includes("@")) {
    return assertEmail(trimmed)
  }

  if (!looksLikeNearAccountId(trimmed)) {
    throw new Response(
      "Enter an email address or a NEAR account, for example alice.near",
      { status: 400 }
    )
  }

  const accountId = normalizeNearAccountId(trimmed)
  const nearAccount = await client.nearAccount.findFirst({
    where: { accountId },
    include: { user: { select: { email: true } } },
  })
  if (nearAccount) {
    return normalizeEmail(nearAccount.user.email)
  }

  const derived = deriveNearEmail(accountId)
  if (derived) {
    return derived
  }

  throw new Response(
    `${accountId} has not signed in to IronHub yet. Only a top-level .near account can be invited before its first sign-in — sub-accounts, .tg accounts, testnet and implicit accounts have to sign in once first.`,
    { status: 404 }
  )
}

/**
 * Invite by email address or NEAR account id.
 *
 * The permission check runs before the identifier is resolved so a
 * non-member can never use this endpoint to probe which NEAR accounts have
 * an account here.
 */
export async function createInvitationForIdentifier(
  organizationId: string,
  actorUserId: string,
  identifier: string,
  role: string,
  client: PrismaLike = prisma
) {
  const actor = await requireMembership(organizationId, actorUserId, client)
  if (!canManageInvitations(actor.role)) {
    throw new Response("You are not allowed to invite members", { status: 403 })
  }

  // Deliberately not re-validated as an email: what comes back is either an
  // address `resolveInviteeEmail` already checked, or the address stored
  // against a NEAR account — and better-near-auth stores a
  // `temp-<hex>@<app url>` placeholder for every account it cannot derive a
  // stable address for (sub-accounts, .tg, testnet, implicit). Running that
  // through `assertEmail` is what used to reject `work.efiz.near` with
  // "Invalid email address".
  const email = await resolveInviteeEmail(identifier, client)

  return insertInvitation(organizationId, actorUserId, email, role, client)
}

export async function createInvitation(
  organizationId: string,
  actorUserId: string,
  email: string,
  role: string,
  client: PrismaLike = prisma
) {
  const actor = await requireMembership(organizationId, actorUserId, client)
  if (!canManageInvitations(actor.role)) {
    throw new Response("You are not allowed to invite members", { status: 403 })
  }

  return insertInvitation(
    organizationId,
    actorUserId,
    assertEmail(email),
    role,
    client
  )
}

/**
 * Shared tail of both invite paths: role check, duplicate checks and the row
 * itself. Assumes the caller has already proved the actor may invite and has
 * settled which address the invitation is addressed to.
 */
async function insertInvitation(
  organizationId: string,
  actorUserId: string,
  email: string,
  role: string,
  client: PrismaLike
) {
  if (!(INVITABLE_ROLES as readonly string[]).includes(role)) {
    throw new Response(`Invalid role: ${role}`, { status: 400 })
  }

  // Store the normalized (lowercased) address so DB-level case-insensitive
  // lookups (Prisma `mode: "insensitive"` and plain equality alike) stay
  // consistent regardless of how the inviter typed it.
  const lowerEmail = normalizeEmail(email)

  const existingMembers = await client.member.findMany({
    where: { organizationId },
    include: { user: { select: { email: true } } },
  })
  const isExistingMember = existingMembers.some(
    (m) => normalizeEmail(m.user.email) === lowerEmail
  )
  if (isExistingMember) {
    throw new Response("This person already belongs to this workspace", {
      status: 409,
    })
  }

  const now = new Date()
  const pending = await client.invitation.findMany({
    where: { organizationId, status: "pending", email: lowerEmail },
  })
  const hasPending = pending.some((inv) => inv.expiresAt > now)
  if (hasPending) {
    throw new Response("A pending invitation already exists for this person", {
      status: 409,
    })
  }

  return client.invitation.create({
    data: {
      id: randomUUID(),
      organizationId,
      email: lowerEmail,
      role,
      status: "pending",
      expiresAt: new Date(now.getTime() + EXPIRY_MS),
      createdAt: now,
      inviterId: actorUserId,
    },
  })
}

export async function listPendingInvitationsForEmail(
  email: string,
  client: PrismaLike = prisma
) {
  const lowerEmail = normalizeEmail(email)
  const now = new Date()

  return client.invitation.findMany({
    where: {
      status: "pending",
      expiresAt: { gt: now },
      email: { equals: lowerEmail, mode: "insensitive" },
    },
    include: {
      organization: { select: { id: true, name: true } },
      inviter: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

/**
 * Maps invitation addresses back to the NEAR account ids that own them.
 *
 * An invitation is stored against an address, but for a wallet user that
 * address is usually a `temp-…` placeholder, which is meaningless to whoever
 * is reading the members page. The account id is the identity they invited
 * and the one to show back to them.
 */
async function nearAccountIdsByEmail(emails: string[], client: PrismaLike) {
  const byEmail = new Map<string, string>()
  const unique = Array.from(new Set(emails.map(normalizeEmail)))
  if (unique.length === 0) return byEmail

  const users = await client.user.findMany({
    where: { email: { in: unique } },
    select: {
      email: true,
      nearAccounts: {
        select: { accountId: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
      },
    },
  })

  for (const user of users) {
    const accountId = user.nearAccounts[0]?.accountId
    if (accountId) byEmail.set(normalizeEmail(user.email), accountId)
  }

  return byEmail
}

export async function listOrgInvitations(
  organizationId: string,
  actorUserId: string,
  client: PrismaLike = prisma
) {
  const actor = await requireMembership(organizationId, actorUserId, client)
  if (!canManageInvitations(actor.role)) {
    throw new Response("You are not allowed to view invitations", {
      status: 403,
    })
  }

  const invitations = await client.invitation.findMany({
    where: { organizationId },
    include: { inviter: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })

  const accountIds = await nearAccountIdsByEmail(
    invitations.map((inv) => inv.email),
    client
  )

  const now = new Date()
  // Display-only derived status: a "pending" row whose expiresAt has passed
  // reads as "expired" to callers without needing a background sweep job.
  return invitations.map((inv) => ({
    ...inv,
    accountId: accountIds.get(normalizeEmail(inv.email)) ?? null,
    displayStatus:
      inv.status === "pending" && inv.expiresAt <= now ? "expired" : inv.status,
  }))
}

async function getInvitationOrThrow(invitationId: string, client: PrismaLike) {
  const invitation = await client.invitation.findUnique({
    where: { id: invitationId },
  })
  if (!invitation) {
    throw new Response("Invitation not found", { status: 404 })
  }
  return invitation
}

function assertAddressedTo(invitationEmail: string, userEmail: string) {
  if (normalizeEmail(invitationEmail) !== normalizeEmail(userEmail)) {
    throw new Response("This invitation is not addressed to you", {
      status: 403,
    })
  }
}

/**
 * Accepts an invitation: upserts the membership and compare-and-sets the
 * invitation to "accepted" in a single transaction, closing the race where
 * two concurrent accept calls (e.g. a double-click, or two tabs) would
 * otherwise both pass the "findUnique + status check" read and both try to
 * create a member row. The `member` unique constraint on
 * (organizationId, userId) plus `upsert` makes double-accept idempotent for
 * membership; the invitation's compare-and-set (`updateMany` guarded on
 * `status: "pending"`) makes the second racer see 0 rows updated and get a
 * 410, matching what a late/expired accept would see.
 *
 * Does NOT touch the session table (see service.ts `setActiveOrganization`
 * doc): the route handler is responsible for calling
 * `auth.api.setActiveOrganization` for the CALLER's own session when
 * `setActive` is requested — using the caller's own request headers, never
 * an arbitrary session row looked up by userId.
 */
export async function acceptInvitation(
  invitationId: string,
  userId: string,
  userEmail: string,
  client: PrismaLike = prisma
) {
  const invitation = await getInvitationOrThrow(invitationId, client)
  assertAddressedTo(invitation.email, userEmail)

  if (invitation.status !== "pending" || invitation.expiresAt <= new Date()) {
    throw new Response("This invitation has expired or is no longer pending", {
      status: 410,
    })
  }

  const role: InvitableRole = (INVITABLE_ROLES as readonly string[]).includes(
    invitation.role ?? ""
  )
    ? (invitation.role as InvitableRole)
    : "member"

  const updated = await client.$transaction(async (tx) => {
    const result = await tx.invitation.updateMany({
      where: { id: invitationId, status: "pending" },
      data: { status: "accepted" },
    })
    if (result.count === 0) {
      throw new Response(
        "This invitation has expired or is no longer pending",
        { status: 410 }
      )
    }

    await tx.member.upsert({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId,
        },
      },
      update: {},
      create: {
        id: randomUUID(),
        organizationId: invitation.organizationId,
        userId,
        role,
        createdAt: new Date(),
      },
    })

    return tx.invitation.findUniqueOrThrow({ where: { id: invitationId } })
  })

  return {
    invitation: updated,
    organizationId: invitation.organizationId,
    role,
  }
}

export async function rejectInvitation(
  invitationId: string,
  userEmail: string,
  client: PrismaLike = prisma
) {
  const invitation = await getInvitationOrThrow(invitationId, client)
  assertAddressedTo(invitation.email, userEmail)

  if (invitation.status !== "pending" || invitation.expiresAt <= new Date()) {
    throw new Response("This invitation has expired or is no longer pending", {
      status: 410,
    })
  }

  const result = await client.invitation.updateMany({
    where: { id: invitationId, status: "pending" },
    data: { status: "rejected" },
  })
  if (result.count === 0) {
    throw new Response("This invitation is no longer pending", { status: 409 })
  }

  return client.invitation.findUniqueOrThrow({ where: { id: invitationId } })
}

export async function cancelInvitation(
  invitationId: string,
  actorUserId: string,
  client: PrismaLike = prisma
) {
  const invitation = await getInvitationOrThrow(invitationId, client)
  const actor = await requireMembership(
    invitation.organizationId,
    actorUserId,
    client
  )
  if (!canManageInvitations(actor.role)) {
    throw new Response("You are not allowed to cancel invitations", {
      status: 403,
    })
  }

  const result = await client.invitation.updateMany({
    where: { id: invitationId, status: "pending" },
    data: { status: "canceled" },
  })
  if (result.count === 0) {
    throw new Response("This invitation is no longer pending", { status: 409 })
  }

  return client.invitation.findUniqueOrThrow({ where: { id: invitationId } })
}
