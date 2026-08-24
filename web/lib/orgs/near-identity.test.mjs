import assert from "node:assert/strict"
import test from "node:test"

import {
  deriveNearEmail,
  displayIdentity,
  formatAccountIdentity,
  isPlaceholderEmail,
  isValidNearAccountId,
  looksLikeNearAccountId,
  normalizeNearAccountId,
} from "./near-identity.ts"

test("looksLikeNearAccountId separates account ids from email addresses", () => {
  assert.equal(looksLikeNearAccountId("alice.near"), true)
  assert.equal(looksLikeNearAccountId("  Alice.NEAR "), true)
  assert.equal(looksLikeNearAccountId("dev.alice.near"), true)
  assert.equal(looksLikeNearAccountId("alice.testnet"), true)
  assert.equal(looksLikeNearAccountId("a".repeat(64).replace(/a/g, "f")), true)

  // Any registrar, not just .near: sub-accounts and Telegram-issued .tg
  // accounts are ordinary NEAR accounts and must be invitable.
  assert.equal(looksLikeNearAccountId("work.efiz.near"), true)
  assert.equal(looksLikeNearAccountId("alice.tg"), true)
  assert.equal(looksLikeNearAccountId("alice-1_b.sweat"), true)

  assert.equal(looksLikeNearAccountId("alice@example.com"), false)
  assert.equal(looksLikeNearAccountId("alice"), false)
  assert.equal(looksLikeNearAccountId(""), false)
  assert.equal(looksLikeNearAccountId("alice near"), false)

  // Shapes NEAR itself rejects.
  assert.equal(looksLikeNearAccountId("alice..near"), false)
  assert.equal(looksLikeNearAccountId(".near"), false)
  assert.equal(looksLikeNearAccountId("-alice.near"), false)
  assert.equal(looksLikeNearAccountId("alice-.near"), false)
  assert.equal(looksLikeNearAccountId(`${"a".repeat(60)}.near`), false)
})

test("deriveNearEmail mirrors better-near-auth for top-level .near accounts only", () => {
  // The shapes better-near-auth can derive a stable address for.
  assert.equal(deriveNearEmail("alice.near"), "alice@near.email")
  assert.equal(deriveNearEmail("Alice.NEAR"), "alice@near.email")

  // Everything else gets a random temp-… address on sign-in, so it must not
  // be guessed here: a wrong guess would address the invitation to nobody.
  assert.equal(deriveNearEmail("dev.alice.near"), null)
  assert.equal(deriveNearEmail("alice.testnet"), null)
  assert.equal(deriveNearEmail(".near"), null)
  assert.equal(deriveNearEmail("alice@example.com"), null)
})

test("formatAccountIdentity reads a derived address back as its account id", () => {
  assert.equal(formatAccountIdentity("alice@near.email"), "alice.near")
  assert.equal(formatAccountIdentity("ALICE@NEAR.EMAIL"), "alice.near")

  // Real mailboxes are shown as typed.
  assert.equal(formatAccountIdentity("alice@example.com"), "alice@example.com")
  assert.equal(formatAccountIdentity("not-an-email"), "not-an-email")
})

test("normalizeNearAccountId trims and lowercases", () => {
  assert.equal(normalizeNearAccountId("  Alice.Near \n"), "alice.near")
})

test("isValidNearAccountId enforces NEAR's grammar and length limits", () => {
  assert.equal(isValidNearAccountId("alice.near"), true)
  assert.equal(isValidNearAccountId("work.efiz.near"), true)
  // A bare word is a valid account id even though it is not a plausible
  // invite target; looksLikeNearAccountId is what rejects it.
  assert.equal(isValidNearAccountId("alice"), true)

  assert.equal(isValidNearAccountId("a"), false)
  assert.equal(isValidNearAccountId("Alice.NEAR".toUpperCase()), true)
  assert.equal(isValidNearAccountId("alice!.near"), false)
})

test("isPlaceholderEmail spots the address minted for underivable accounts", () => {
  // better-near-auth uses the app's BETTER_AUTH_URL as the domain, so the
  // result is not even a syntactically valid address.
  assert.equal(isPlaceholderEmail("temp-9f2c1a2b@http://localhost:3000"), true)
  assert.equal(isPlaceholderEmail("TEMP-9F2C1A2B@https://ironhub.xyz"), true)

  assert.equal(isPlaceholderEmail("alice@near.email"), false)
  assert.equal(isPlaceholderEmail("temporary@example.com"), false)
})

test("displayIdentity prefers the account id and hides placeholders", () => {
  assert.equal(
    displayIdentity("temp-9f2c1a2b@http://localhost:3000", "work.efiz.near"),
    "work.efiz.near"
  )
  assert.equal(
    displayIdentity("temp-9f2c1a2b@http://localhost:3000"),
    undefined
  )
  assert.equal(displayIdentity("alice@near.email"), "alice.near")
  assert.equal(displayIdentity("alice@example.com"), "alice@example.com")
  assert.equal(displayIdentity(null), undefined)
})
