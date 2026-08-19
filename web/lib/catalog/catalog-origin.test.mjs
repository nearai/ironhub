import assert from "node:assert/strict"
import test from "node:test"

import {
  CATALOG_ORIGIN_SETTING,
  CatalogOriginError,
  assertCatalogOriginBaseUrl,
  requireCatalogOriginBaseUrl,
} from "./catalog-origin.ts"

/**
 * Every rejection has to name the setting. The value is an environment
 * variable, the failure surfaces in a log or on an artifact screen, and
 * "invalid URL" without the variable's name sends the reader looking at the
 * request instead of at the deployment.
 */
function assertRejected(value, pattern) {
  assert.throws(
    () => assertCatalogOriginBaseUrl(value),
    (error) => {
      assert.ok(
        error instanceof CatalogOriginError,
        `expected a CatalogOriginError for ${value}, got ${error}`
      )
      assert.match(error.message, new RegExp(CATALOG_ORIGIN_SETTING))
      assert.match(error.message, pattern)
      return true
    },
    `expected ${value} to be rejected`
  )
}

test("a public https origin is accepted and returned without trailing slashes", () => {
  assert.equal(
    assertCatalogOriginBaseUrl("https://hub.ironclaw.com"),
    "https://hub.ironclaw.com"
  )
  assert.equal(
    assertCatalogOriginBaseUrl("https://hub.example.com/"),
    "https://hub.example.com"
  )
  assert.equal(
    assertCatalogOriginBaseUrl("https://hub.example.com///"),
    "https://hub.example.com"
  )
})

test("a non-default port is accepted -- the agent compares ports, it does not forbid them", () => {
  assert.equal(
    assertCatalogOriginBaseUrl("https://hub.example.com:8443"),
    "https://hub.example.com:8443"
  )
})

test("an unset or unparseable value is rejected", () => {
  assertRejected(undefined, /is not set/)
  assertRejected(null, /is not set/)
  assertRejected("", /is not set/)
  assertRejected("hub.example.com", /not a valid URL/)
  assertRejected("://hub.example.com", /not a valid URL/)
})

test("a non-https scheme is rejected", () => {
  assertRejected("http://hub.example.com", /must be an https URL/)
  assertRejected("ftp://hub.example.com", /must be an https URL/)
})

test("user information is rejected", () => {
  assertRejected("https://user@hub.example.com", /user information/)
  assertRejected("https://user:pass@hub.example.com", /user information/)
})

test("a query or fragment is rejected", () => {
  assertRejected("https://hub.example.com?a=1", /no query or fragment/)
  assertRejected("https://hub.example.com#x", /no query or fragment/)
})

// The host rules below are `host_is_disallowed_target` in
// `ironclaw:.../ironhub/catalog.rs:549`. Each shape here is one the agent
// rejects outright, so a hub configured with it signs manifests no agent will
// ever accept.
test("a bare IP address is rejected, v4 and v6", () => {
  assertRejected("https://127.0.0.1", /not an IP address/)
  assertRejected("https://10.0.0.5:3000", /not an IP address/)
  assertRejected("https://[::1]", /not an IP address/)
  assertRejected("https://[2606:4700:4700::1111]", /not an IP address/)
})

test("localhost and every dotless host are rejected", () => {
  assertRejected("http://localhost:3000", /must be an https URL/)
  assertRejected("https://localhost:3000", /has no dot/)
  assertRejected("https://ironhub", /has no dot/)
  // The default in .env.example, which is exactly the value that made this
  // check necessary (design.md D6).
  assertRejected("https://localhost", /has no dot/)
})

test("internal-network suffixes are rejected", () => {
  for (const suffix of [
    ".localhost",
    ".local",
    ".internal",
    ".intranet",
    ".lan",
    ".home",
    ".corp",
    ".private",
  ]) {
    assertRejected(`https://hub${suffix}`, new RegExp(`ends in "\\${suffix}"`))
  }
})

test("a trailing dot does not smuggle a disallowed host past the check", () => {
  // The agent strips it before testing (`catalog.rs:550`), so this must too --
  // otherwise `localhost.` would pass here and be rejected there.
  assertRejected("https://localhost.", /has no dot/)
  assertRejected("https://hub.local.", /ends in "\.local"/)
})

test("requireCatalogOriginBaseUrl reads the environment and applies the same rules", () => {
  const original = process.env[CATALOG_ORIGIN_SETTING]
  try {
    process.env[CATALOG_ORIGIN_SETTING] = "https://hub.example.com/"
    assert.equal(requireCatalogOriginBaseUrl(), "https://hub.example.com")

    process.env[CATALOG_ORIGIN_SETTING] = "http://localhost:3000"
    assert.throws(
      () => requireCatalogOriginBaseUrl(),
      (error) => error instanceof CatalogOriginError
    )
  } finally {
    if (original === undefined) delete process.env[CATALOG_ORIGIN_SETTING]
    else process.env[CATALOG_ORIGIN_SETTING] = original
  }
})

// --- IRONHUB_ALLOW_LOCAL_ORIGINS ---------------------------------------------
// The flag is the supported alternative to a public tunnel for local end-to-end
// runs. What matters in these tests is not that it works but that it cannot be
// reached by accident: two conditions, a production build vetoes it, and it
// never touches a public host.

function withEnv(vars, run) {
  const originals = Object.fromEntries(
    Object.keys(vars).map((key) => [key, process.env[key]])
  )
  Object.assign(process.env, vars)
  try {
    run()
  } finally {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

test("the local-origins flag accepts http on a local host", () => {
  withEnv(
    { NODE_ENV: "development", IRONHUB_ALLOW_LOCAL_ORIGINS: "true" },
    () => {
      assert.equal(
        assertCatalogOriginBaseUrl("http://localhost:3000"),
        "http://localhost:3000"
      )
      assert.equal(
        assertCatalogOriginBaseUrl("http://127.0.0.1:3000"),
        "http://127.0.0.1:3000"
      )
      assert.equal(
        assertCatalogOriginBaseUrl("http://ironhub-devstack:3000"),
        "http://ironhub-devstack:3000"
      )
      assert.equal(
        assertCatalogOriginBaseUrl("http://hub.localhost:3000"),
        "http://hub.localhost:3000"
      )
    }
  )
})

test("the local-origins flag is vetoed by a production build", () => {
  withEnv(
    { NODE_ENV: "production", IRONHUB_ALLOW_LOCAL_ORIGINS: "true" },
    () => assertRejected("http://localhost:3000", /must be an https URL/)
  )
})

test("the local-origins flag requires the exact string 'true'", () => {
  for (const value of ["1", "yes", "TRUE", "", undefined]) {
    withEnv(
      { NODE_ENV: "development", IRONHUB_ALLOW_LOCAL_ORIGINS: value },
      () => assertRejected("http://localhost:3000", /must be an https URL/)
    )
  }
})

test("the local-origins flag does not relax anything for a public host", () => {
  withEnv(
    { NODE_ENV: "development", IRONHUB_ALLOW_LOCAL_ORIGINS: "true" },
    () => {
      // http on a real host stays rejected: the flag keys off the host, so a
      // typo'd public origin cannot ride in on it.
      assertRejected("http://hub.example.com", /must be an https URL/)
      assertRejected("https://hub.example.com?x=1", /no query or fragment/)
      assertRejected("https://u:p@hub.example.com", /user information/)
    }
  )
})

test("a rejection points at the flag only when the flag is off", () => {
  withEnv({ NODE_ENV: "development", IRONHUB_ALLOW_LOCAL_ORIGINS: "" }, () =>
    assertRejected("http://localhost:3000", /IRONHUB_ALLOW_LOCAL_ORIGINS=true/)
  )
  withEnv(
    { NODE_ENV: "development", IRONHUB_ALLOW_LOCAL_ORIGINS: "true" },
    () => assertRejected("http://hub.example.com", /^(?!.*ALLOW_LOCAL).*$/s)
  )
})
