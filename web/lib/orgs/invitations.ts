import { randomUUID } from "node:crypto"

import { prisma } from "../db/index.ts"
import { canManageInvitations, isRole } from "./roles.ts"

type PrismaLike = typeof prisma

const INVITABLE_ROLES = ["admin", "member"] as const
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function assertEmail(email: string) {
  const trimmed = email.trim()
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

  if (!(INVITABLE_ROLES as readonly string[]).includes(role)) {
    throw new Response(`Invalid role: ${role}`, { status: 400 })
  }

  const normalizedEmail = assertEmail(email)
  const lowerEmail = normalizeEmail(normalizedEmail)

  const existingMembers = await client.member.findMany({
    where: { organizationId },
    include: { user: { select: { email: true } } },
  })
  const isExistingMember = existingMembers.some(
    (m) => normalizeEmail(m.user.email) === lowerEmail
  )
  if (isExistingMember) {
    throw new Response("This email already belongs to a member", { status: 409 })
  }

  const now = new Date()
  const pending = await client.invitation.findMany({
    where: { organizationId, status: "pending" },
  })
  const hasPending = pending.some(
    (inv) => normalizeEmail(inv.email) === lowerEmail && inv.expiresAt > now
  )
  if (hasPending) {
    throw new Response(
      "A pending invitation already exists for this email",
      { status: 409 }
    )
  }

  return client.invitation.create({
    data: {
      id: randomUUID(),
      organizationId,
      email: normalizedEmail,
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

  const invitations = await client.invitation.findMany({
    where: { status: "pending" },
    include: {
      organization: { select: { id: true, name: true } },
      inviter: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return invitations.filter(
    (inv) => normalizeEmail(inv.email) === lowerEmail && inv.expiresAt > now
  )
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

  return client.invitation.findMany({
    where: { organizationId },
    include: { inviter: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })
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

export async function acceptInvitation(
  invitationId: string,
  userId: string,
  userEmail: string,
  setActive: boolean,
  client: PrismaLike = prisma
) {
  const invitation = await getInvitationOrThrow(invitationId, client)

  if (normalizeEmail(invitation.email) !== normalizeEmail(userEmail)) {
    throw new Response("This invitation is not addressed to you", {
      status: 403,
    })
  }

  if (invitation.status !== "pending" || invitation.expiresAt <= new Date()) {
    throw new Response("This invitation has expired or is no longer pending", {
      status: 410,
    })
  }

  const role = isRole(invitation.role ?? "") ? invitation.role! : "member"

  const existing = await client.member.findFirst({
    where: { organizationId: invitation.organizationId, userId },
  })
  if (!existing) {
    await client.member.create({
      data: {
        id: randomUUID(),
        organizationId: invitation.organizationId,
        userId,
        role,
        createdAt: new Date(),
      },
    })
  }

  const updated = await client.invitation.update({
    where: { id: invitationId },
    data: { status: "accepted" },
  })

  if (setActive) {
    const session = await client.session.findFirst({ where: { userId } })
    if (session) {
      await client.session.update({
        where: { id: session.id },
        data: { activeOrganizationId: invitation.organizationId },
      })
    }
  }

  return updated
}

export async function rejectInvitation(
  invitationId: string,
  userEmail: string,
  client: PrismaLike = prisma
) {
  const invitation = await getInvitationOrThrow(invitationId, client)

  if (normalizeEmail(invitation.email) !== normalizeEmail(userEmail)) {
    throw new Response("This invitation is not addressed to you", {
      status: 403,
    })
  }

  if (invitation.status !== "pending") {
    throw new Response("This invitation is no longer pending", { status: 409 })
  }

  return client.invitation.update({
    where: { id: invitationId },
    data: { status: "rejected" },
  })
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

  if (invitation.status !== "pending") {
    throw new Response("This invitation is no longer pending", { status: 409 })
  }

  return client.invitation.update({
    where: { id: invitationId },
    data: { status: "canceled" },
  })
}
