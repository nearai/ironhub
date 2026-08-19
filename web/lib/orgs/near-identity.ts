/**
 * Translating between NEAR account ids and the email addresses BetterAuth
 * stores for wallet users.
 *
 * Pure string handling with no database access, so both server routes and
 * client components can import it.
 */

const DERIVED_EMAIL_DOMAIN = "near.email"
const NEAR_ACCOUNT_PATTERN = /^[a-z0-9._-]+$/
const IMPLICIT_ACCOUNT_PATTERN = /^[a-f0-9]{64}$/

export function normalizeNearAccountId(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Whether a typed identifier is meant as a NEAR account rather than an email.
 * Deliberately permissive about the network suffix — the caller still has to
 * resolve the account to a user, which is where a typo actually fails.
 */
export function looksLikeNearAccountId(value: string): boolean {
  const accountId = normalizeNearAccountId(value)
  if (!accountId || !NEAR_ACCOUNT_PATTERN.test(accountId)) return false
  return (
    accountId.endsWith(".near") ||
    accountId.endsWith(".testnet") ||
    IMPLICIT_ACCOUNT_PATTERN.test(accountId)
  )
}

/**
 * Mirrors `deriveEmail` in better-near-auth: a top-level `<name>.near`
 * account is given the stable address `<name>@near.email` the first time it
 * signs in. Every other shape (sub-accounts, testnet, implicit accounts) gets
 * a random `temp-…@…` address instead, so it cannot be derived — those can
 * only be invited after they have signed in at least once.
 */
export function deriveNearEmail(accountId: string): string | null {
  const normalized = normalizeNearAccountId(accountId)
  if (!normalized.endsWith(".near")) return null

  const localPart = normalized.slice(0, -".near".length)
  if (!localPart || localPart.includes(".")) return null

  return `${localPart}@${DERIVED_EMAIL_DOMAIN}`
}

/**
 * Renders a stored address the way its owner would recognise it: a derived
 * `alice@near.email` reads back as `alice.near`, everything else is left
 * alone.
 */
export function formatAccountIdentity(email: string): string {
  const [localPart, domain] = email.trim().toLowerCase().split("@")
  if (!localPart || domain !== DERIVED_EMAIL_DOMAIN) return email
  return `${localPart}.near`
}
