/**
 * Maximum number of organizations a single account may create.
 *
 * Counted over owner memberships rather than all memberships: being invited
 * into other people's workspaces must never consume a member's own quota.
 * The organization auto-created on first sign-in (`lib/auth/organization.ts`)
 * is owned by the user and therefore counts against it.
 */
export const MAX_ORGANIZATIONS_PER_USER = 5

export const ORGANIZATION_LIMIT_MESSAGE = `You have reached the maximum number of organizations (${MAX_ORGANIZATIONS_PER_USER}).`

export function hasReachedOrganizationLimit(ownedCount: number): boolean {
  return ownedCount >= MAX_ORGANIZATIONS_PER_USER
}
