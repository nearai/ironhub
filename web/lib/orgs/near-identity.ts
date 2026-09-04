/**
 * Translating between NEAR account ids and the email addresses BetterAuth
 * stores for wallet users.
 *
 * Pure string handling with no database access, so both server routes and
 * client components can import it.
 */

const DERIVED_EMAIL_DOMAIN = "near.email"

/**
 * NEAR's own account id rules: 2-64 characters, lowercase alphanumeric labels
 * joined by `.`, where a label may also contain `-`/`_` between alphanumerics.
 *
 * Deliberately says nothing about the top-level account. `.near` is only the
 * best known registrar — `.tg` (Telegram-issued accounts), `.testnet` and any
 * other top-level account are equally real, and a sub-account like
 * `work.efiz.near` is just as valid as `efiz.near`.
 */
const NEAR_ACCOUNT_PATTERN =
  /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/
const MIN_ACCOUNT_ID_LENGTH = 2
const MAX_ACCOUNT_ID_LENGTH = 64

const IMPLICIT_ACCOUNT_PATTERN = /^[a-f0-9]{64}$/

/**
 * The address better-near-auth mints for an account it cannot derive a stable
 * one for: `temp-<8 hex>@<recipient>`. The recipient is this app's
 * `BETTER_AUTH_URL`, so the result is a placeholder rather than a mailbox and
 * must never be shown to a human as if it were one.
 */
const TEMPORARY_EMAIL_PATTERN = /^temp-[0-9a-f]{8}@/

export function normalizeNearAccountId(value: string): string {
  return value.trim().toLowerCase()
}

/** Whether a string obeys NEAR's account id grammar and length limits. */
export function isValidNearAccountId(value: string): boolean {
  const accountId = normalizeNearAccountId(value)
  return (
    accountId.length >= MIN_ACCOUNT_ID_LENGTH &&
    accountId.length <= MAX_ACCOUNT_ID_LENGTH &&
    NEAR_ACCOUNT_PATTERN.test(accountId)
  )
}

/**
 * Whether a typed identifier is meant as a NEAR account rather than an email.
 *
 * Any named account under any top-level account counts — `alice.near`,
 * `work.efiz.near`, `alice.tg`, `alice.testnet` — plus 64-hex implicit
 * accounts. A bare word with no top-level account (`alice`) is a typo, not an
 * account, so it is rejected here rather than sent to a lookup that can only
 * miss. Whether the account actually exists is settled by resolving it.
 */
export function looksLikeNearAccountId(value: string): boolean {
  const accountId = normalizeNearAccountId(value)
  if (!isValidNearAccountId(accountId)) return false
  return IMPLICIT_ACCOUNT_PATTERN.test(accountId) || accountId.includes(".")
}

/**
 * Mirrors `deriveEmail` in better-near-auth: a top-level `<name>.near`
 * account is given the stable address `<name>@near.email` the first time it
 * signs in. Every other shape (sub-accounts, `.tg`, testnet, implicit
 * accounts) gets a random `temp-…@…` address instead, so it cannot be derived
 * — those can only be invited after they have signed in at least once.
 */
export function deriveNearEmail(accountId: string): string | null {
  const normalized = normalizeNearAccountId(accountId)
  if (!normalized.endsWith(".near")) return null

  const localPart = normalized.slice(0, -".near".length)
  if (!localPart || localPart.includes(".")) return null

  return `${localPart}@${DERIVED_EMAIL_DOMAIN}`
}

/**
 * Whether a stored address is a better-near-auth placeholder rather than a
 * mailbox its owner would recognise. Such a user is identified by their NEAR
 * account id instead.
 */
export function isPlaceholderEmail(email: string): boolean {
  return TEMPORARY_EMAIL_PATTERN.test(email.trim().toLowerCase())
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

/**
 * The label to show for an invitee or member: their NEAR account id when one
 * is known, the readable form of their address otherwise, and nothing at all
 * when only a placeholder address exists (the caller falls back to a name).
 */
export function displayIdentity(
  email: string | null | undefined,
  accountId?: string | null
): string | undefined {
  if (accountId) return normalizeNearAccountId(accountId)
  if (!email) return undefined
  if (isPlaceholderEmail(email)) return undefined
  return formatAccountIdentity(email)
}
