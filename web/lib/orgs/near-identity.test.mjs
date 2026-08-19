import assert from "node:assert/strict"
import test from "node:test"

import {
  deriveNearEmail,
  formatAccountIdentity,
  looksLikeNearAccountId,
  normalizeNearAccountId,
} from "./near-identity.ts"

test("looksLikeNearAccountId separates account ids from email addresses", () => {
  assert.equal(looksLikeNearAccountId("alice.near"), true)
  assert.equal(looksLikeNearAccountId("  Alice.NEAR "), true)
  assert.equal(looksLikeNearAccountId("dev.alice.near"), true)
  assert.equal(looksLikeNearAccountId("alice.testnet"), true)
  assert.equal(looksLikeNearAccountId("a".repeat(64).replace(/a/g, "f")), true)

  assert.equal(looksLikeNearAccountId("alice@example.com"), false)
  assert.equal(looksLikeNearAccountId("alice"), false)
  assert.equal(looksLikeNearAccountId(""), false)
  assert.equal(looksLikeNearAccountId("alice near"), false)
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
