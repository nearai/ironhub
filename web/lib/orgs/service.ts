import { randomUUID } from "node:crypto"

import { prisma } from "../db/index.ts"
import {
  ORGANIZATION_LIMIT_MESSAGE,
  hasReachedOrganizationLimit,
} from "./limits.ts"
import {
  canChangeRole,
  canRemoveMember,
  isLastOwner,
  isRole,
  ownerCount,
} from "./roles.ts"

type PrismaLike = typeof prisma

function assertOrgName(name: string) {
  const trimmed = name.trim()
  if (trimmed.length < 1 || trimmed.length > 100) {
    throw new Response("name must be 1-100 characters", { status: 400 })
  }
  return trimmed
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function listMyOrganizations(
  userId: string,
  client: PrismaLike = prisma
) {
  const members = await client.member.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  })

  return members.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
  }))
}

export async function createOrganization(
  userId: string,
  name: string,
  client: PrismaLike = prisma
) {
  const trimmed = assertOrgName(name)

  // Owner memberships only: organizations the caller was invited into do not
  // consume their own quota. Mirrored in the BetterAuth `organizationLimit`
  // option (lib/auth/server.ts), which guards the client SDK's create path.
  const ownedCount = await client.member.count({
    where: { userId, role: "owner" },
  })
  if (hasReachedOrganizationLimit(ownedCount)) {
    throw new Response(ORGANIZATION_LIMIT_MESSAGE, { status: 403 })
  }

  // Truncate to keep the slug reasonably short, then disambiguate with a
  // short random suffix instead of Date.now() (which can collide when two
  // orgs are created in the same millisecond and grows unboundedly with
  // repeated retries).
  const base = slugify(trimmed).slice(0, 48) || "org"
  const suffix = randomUUID().slice(0, 8)

  return client.organization.create({
    data: {
      id: randomUUID(),
      name: trimmed,
      slug: `${base}-${suffix}`,
      createdAt: new Date(),
      members: {
        create: {
          id: randomUUID(),
          userId,
          role: "owner",
          createdAt: new Date(),
        },
      },
    },
  })
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
 * Verifies the caller belongs to the target organization. Does NOT touch the
 * session row: BetterAuth's `session.cookieCache` (30d TTL) serves
 * `activeOrganizationId` from the signed session cookie, so writing to the
 * `session` table directly would be invisible to `getSessionFromCtx` for up
 * to 30 days. Callers (route handlers) must follow up with
 * `auth.api.setActiveOrganization({ headers, body: { organizationId } })`,
 * which updates the DB row AND refreshes the cookie via `setSessionCookie`.
 */
export async function setActiveOrganization(
  userId: string,
  organizationId: string,
  client: PrismaLike = prisma
) {
  await requireMembership(organizationId, userId, client)
  return organizationId
}

export async function renameOrganization(
  organizationId: string,
  userId: string,
  name: string,
  client: PrismaLike = prisma
) {
  const member = await requireMembership(organizationId, userId, client)
  if (member.role !== "owner") {
    throw new Response("Only the owner can rename the organization", {
      status: 403,
    })
  }

  const trimmed = assertOrgName(name)

  return client.organization.update({
    where: { id: organizationId },
    data: { name: trimmed },
  })
}

export async function listMembers(
  organizationId: string,
  userId: string,
  client: PrismaLike = prisma
) {
  await requireMembership(organizationId, userId, client)

  return client.member.findMany({
    where: { organizationId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  })
}

/**
 * Picks a fallback organization for a user who just left `excludeOrganizationId`,
 * preferring their oldest remaining membership (their personal org tends to be
 * the earliest created).
 */
async function pickFallbackOrganization(
  userId: string,
  excludeOrganizationId: string,
  client: PrismaLike
) {
  const remaining = await client.member.findFirst({
    where: { userId, organizationId: { not: excludeOrganizationId } },
    orderBy: { createdAt: "asc" },
  })

  return remaining?.organizationId ?? null
}

const LAST_OWNER_MESSAGE =
  "You are the only owner of this organization. Promote another member to owner before leaving."

/**
 * Removes the caller's membership. The last-owner check and the delete are
 * performed inside a single transaction with a conditional `deleteMany`
 * (owner count re-asserted at write time) to close the TOCTOU window between
 * the read and the write under concurrent leave/remove/role-change calls.
 *
 * Does not touch the session row (see `setActiveOrganization` doc). If the
 * organization being left is the caller's currently active one, this
 * returns `{ wasActive: true, fallbackOrganizationId }` so the route can
 * call `auth.api.setActiveOrganization` (which also handles the cookie).
 */
export async function leaveOrganization(
  organizationId: string,
  userId: string,
  currentActiveOrganizationId: string | null | undefined,
  client: PrismaLike = prisma
) {
  await requireMembership(organizationId, userId, client)

  await client.$transaction(async (tx) => {
    const orgMembers = await tx.member.findMany({
      where: { organizationId },
      select: { userId: true, role: true },
    })

    if (isLastOwner(orgMembers, userId)) {
      throw new Response(LAST_OWNER_MESSAGE, { status: 409 })
    }

    // Conditional delete: only removes the row if the member is still
    // present with the role we just observed non-last-owner for. If a
    // concurrent change already removed it, this is a no-op (idempotent).
    const result = await tx.member.deleteMany({
      where: { organizationId, userId },
    })

    if (result.count === 0) {
      throw new Response("Not a member of this organization", { status: 403 })
    }

    // Re-check inside the same transaction: if this delete just made the
    // organization ownerless (raced with another owner's role change),
    // fail the whole transaction so it rolls back.
    const remainingOwners = orgMembers.filter(
      (m) => m.role === "owner" && m.userId !== userId
    ).length
    if (remainingOwners === 0 && orgMembers.some((m) => m.role === "owner")) {
      throw new Response(LAST_OWNER_MESSAGE, { status: 409 })
    }
  })

  const wasActive = currentActiveOrganizationId === organizationId
  if (!wasActive) {
    return { wasActive: false as const, fallbackOrganizationId: null }
  }

  const fallbackOrganizationId = await pickFallbackOrganization(
    userId,
    organizationId,
    client
  )
  return { wasActive: true as const, fallbackOrganizationId }
}

export async function removeMember(
  organizationId: string,
  actorUserId: string,
  targetUserId: string,
  client: PrismaLike = prisma
) {
  const actor = await requireMembership(organizationId, actorUserId, client)
  const target = await client.member.findFirst({
    where: { organizationId, userId: targetUserId },
  })

  if (!target) {
    throw new Response("Member not found", { status: 404 })
  }

  if (!canRemoveMember(actor.role, target.role)) {
    throw new Response("You are not allowed to remove this member", {
      status: 403,
    })
  }

  await client.$transaction(async (tx) => {
    const orgMembers = await tx.member.findMany({
      where: { organizationId },
      select: { userId: true, role: true },
    })

    if (isLastOwner(orgMembers, targetUserId)) {
      throw new Response("Cannot remove the only owner of the organization", {
        status: 409,
      })
    }

    const result = await tx.member.deleteMany({
      where: { id: target.id },
    })
    if (result.count === 0) {
      throw new Response("Member not found", { status: 404 })
    }

    // Self-heal the removed user's sessions: their cookie may still carry
    // this org as active for up to 30 days (cookieCache TTL). Clearing the
    // DB row means the next cookie refresh/expiry will resolve correctly.
    await tx.session.updateMany({
      where: { userId: targetUserId, activeOrganizationId: organizationId },
      data: { activeOrganizationId: null },
    })
  })
}

export async function changeMemberRole(
  organizationId: string,
  actorUserId: string,
  targetUserId: string,
  newRole: string,
  client: PrismaLike = prisma
) {
  if (!isRole(newRole)) {
    throw new Response(`Invalid role: ${newRole}`, { status: 400 })
  }

  const actor = await requireMembership(organizationId, actorUserId, client)
  const target = await client.member.findFirst({
    where: { organizationId, userId: targetUserId },
  })

  if (!target) {
    throw new Response("Member not found", { status: 404 })
  }

  if (!canChangeRole(actor.role, target.role, newRole)) {
    throw new Response("You are not allowed to change this member's role", {
      status: 403,
    })
  }

  return client.$transaction(async (tx) => {
    if (target.role === "owner" && newRole !== "owner") {
      const orgMembers = await tx.member.findMany({
        where: { organizationId },
        select: { userId: true, role: true },
      })

      if (ownerCount(orgMembers) <= 1) {
        throw new Response("Cannot demote the only owner of the organization", {
          status: 409,
        })
      }
    }

    const result = await tx.member.updateMany({
      where: { id: target.id, role: target.role },
      data: { role: newRole },
    })
    if (result.count === 0) {
      throw new Response("Member role changed concurrently, please retry", {
        status: 409,
      })
    }

    return tx.member.findFirst({ where: { id: target.id } })
  })
}
