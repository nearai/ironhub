export const ROLES = ["owner", "admin", "member"] as const

export type Role = (typeof ROLES)[number]

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value)
}

/** owner/admin manage members, invitations, and artifacts. */
export function canManageMembers(role: string): boolean {
  return role === "owner" || role === "admin"
}

export function canManageInvitations(role: string): boolean {
  return canManageMembers(role)
}

export function canManageArtifacts(role: string): boolean {
  return canManageMembers(role)
}

/**
 * owner can remove anyone; admin can remove members/admins but not owners;
 * member cannot remove anyone.
 */
export function canRemoveMember(
  actorRole: string,
  targetRole: string
): boolean {
  if (actorRole === "owner") return true
  if (actorRole === "admin") return targetRole !== "owner"
  return false
}

/**
 * owner can set any role (including granting/demoting owner).
 * admin can only manage members/admins: cannot touch owners, cannot grant owner.
 */
export function canChangeRole(
  actorRole: string,
  targetRole: string,
  newRole: string
): boolean {
  if (actorRole === "owner") return true
  if (actorRole === "admin") {
    return targetRole !== "owner" && newRole !== "owner"
  }
  return false
}

export type MemberLike = { userId: string; role: string }

export function ownerCount(members: MemberLike[]): number {
  return members.filter((m) => m.role === "owner").length
}

export function isLastOwner(members: MemberLike[], userId: string): boolean {
  const member = members.find((m) => m.userId === userId)
  if (!member || member.role !== "owner") return false
  return ownerCount(members) <= 1
}
