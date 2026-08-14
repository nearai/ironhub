import { randomUUID } from "node:crypto"

import { prisma } from "../db/index.ts"
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

export async function listMyOrganizations(userId: string, client: PrismaLike = prisma) {
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
  const base = slugify(trimmed) || "org"

  return client.organization.create({
    data: {
      id: randomUUID(),
      name: trimmed,
      slug: `${base}-${Date.now()}`,
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

export async function setActiveOrganization(
  userId: string,
  sessionId: string,
  organizationId: string,
  client: PrismaLike = prisma
) {
  await requireMembership(organizationId, userId, client)

  return client.session.update({
    where: { id: sessionId },
    data: { activeOrganizationId: organizationId },
  })
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

export async function leaveOrganization(
  organizationId: string,
  userId: string,
  sessionId: string,
  client: PrismaLike = prisma
) {
  const member = await requireMembership(organizationId, userId, client)

  const orgMembers = await client.member.findMany({
    where: { organizationId },
    select: { userId: true, role: true },
  })

  if (isLastOwner(orgMembers, userId)) {
    throw new Response(
      "You are the only owner. Transfer ownership or delete the organization first.",
      { status: 409 }
    )
  }

  await client.member.delete({ where: { id: member.id } })

  const session = await client.session.findUnique({ where: { id: sessionId } })
  if (session?.activeOrganizationId === organizationId) {
    const fallback = await pickFallbackOrganization(userId, organizationId, client)
    await client.session.update({
      where: { id: sessionId },
      data: { activeOrganizationId: fallback },
    })
  }
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

  const orgMembers = await client.member.findMany({
    where: { organizationId },
    select: { userId: true, role: true },
  })

  if (isLastOwner(orgMembers, targetUserId)) {
    throw new Response("Cannot remove the only owner of the organization", {
      status: 409,
    })
  }

  await client.member.delete({ where: { id: target.id } })
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

  if (target.role === "owner" && newRole !== "owner") {
    const orgMembers = await client.member.findMany({
      where: { organizationId },
      select: { userId: true, role: true },
    })

    if (ownerCount(orgMembers) <= 1) {
      throw new Response("Cannot demote the only owner of the organization", {
        status: 409,
      })
    }
  }

  return client.member.update({
    where: { id: target.id },
    data: { role: newRole },
  })
}
