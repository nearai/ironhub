import assert from "node:assert/strict"
import test from "node:test"

import {
  InMemoryRateLimitStore,
  createRateLimiter,
  rateLimitExceededResponse,
  resolveClientIp,
} from "./rate-limit.ts"

test("requests within the limit are allowed", () => {
  const checkRateLimit = createRateLimiter({ limit: 3, windowMs: 1000 })

  assert.deepEqual(checkRateLimit("a", 0), { allowed: true })
  assert.deepEqual(checkRateLimit("a", 0), { allowed: true })
  assert.deepEqual(checkRateLimit("a", 0), { allowed: true })
})

test("a burst past the limit is throttled with a retry-after", () => {
  const checkRateLimit = createRateLimiter({ limit: 2, windowMs: 1000 })

  checkRateLimit("client", 0)
  checkRateLimit("client", 0)
  const result = checkRateLimit("client", 0)

  assert.equal(result.allowed, false)
  if (!result.allowed) {
    assert.equal(result.retryAfterSeconds, 1)
  }
})

test("different keys have independent windows", () => {
  const checkRateLimit = createRateLimiter({ limit: 1, windowMs: 1000 })

  assert.equal(checkRateLimit("a", 0).allowed, true)
  assert.equal(checkRateLimit("b", 0).allowed, true)
  assert.equal(checkRateLimit("a", 0).allowed, false)
})

test("the window resets after it elapses", () => {
  const checkRateLimit = createRateLimiter({ limit: 1, windowMs: 1000 })

  assert.equal(checkRateLimit("a", 0).allowed, true)
  assert.equal(checkRateLimit("a", 500).allowed, false)
  assert.equal(checkRateLimit("a", 1001).allowed, true)
})

test("rateLimitExceededResponse sets status 429 and Retry-After", async () => {
  const response = rateLimitExceededResponse(7)

  assert.equal(response.status, 429)
  assert.equal(response.headers.get("Retry-After"), "7")
})

test("resolveClientIp prefers x-forwarded-for, then x-real-ip, then unknown", () => {
  const forwarded = new Request("https://example.com", {
    headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
  })
  assert.equal(resolveClientIp(forwarded), "1.2.3.4")

  const real = new Request("https://example.com", {
    headers: { "x-real-ip": "9.9.9.9" },
  })
  assert.equal(resolveClientIp(real), "9.9.9.9")

  const none = new Request("https://example.com")
  assert.equal(resolveClientIp(none), "unknown")
})

test("a custom store can be swapped in", () => {
  const calls = []
  const store = {
    hit(key, windowMs, now) {
      calls.push([key, windowMs, now])
      return { count: 1, resetAt: now + windowMs }
    },
  }
  const checkRateLimit = createRateLimiter({ limit: 5, windowMs: 2000, store })

  checkRateLimit("k", 42)

  assert.deepEqual(calls, [["k", 2000, 42]])
})

test("InMemoryRateLimitStore.clear resets tracked windows", () => {
  const store = new InMemoryRateLimitStore()
  const checkRateLimit = createRateLimiter({ limit: 1, windowMs: 1000, store })

  assert.equal(checkRateLimit("a", 0).allowed, true)
  assert.equal(checkRateLimit("a", 0).allowed, false)

  store.clear()

  assert.equal(checkRateLimit("a", 0).allowed, true)
})
