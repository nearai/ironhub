import assert from "node:assert/strict"
import test from "node:test"

import { inferCategory, inferToolTags } from "./inference.ts"

test("does not treat ordinary lowercase near prose as a NEAR signal", () => {
  const tags = inferToolTags(
    "attio",
    {
      http: {
        allowlist: [{ host: "api.attio.com" }],
        credentials: { token: { secret_name: "attio_api_key" } },
      },
      secrets: { allowed_names: ["attio_api_key"] },
    },
    "Attio rate-limits reads near 100 req/s."
  )

  assert.equal(tags.includes("NEAR"), false)
  assert.equal(tags.includes("No required secrets"), false)
  assert.equal(tags.includes("HTTP allowlist"), true)
  assert.equal(inferCategory("attio", "reads near 100 req/s"), "Dev Tools")
})

test("reads nested legacy security signals when deriving tags", () => {
  const tags = inferToolTags(
    "wordpress",
    {
      capabilities: {
        http: {
          allowlist: [{ host: "store.example.com" }],
          credentials: { token: { secret_name: "wp_app_password" } },
        },
        secrets: { allowed_names: ["wp_app_password"] },
      },
    },
    "WordPress integration"
  )

  assert.equal(tags.includes("HTTP allowlist"), true)
  assert.equal(tags.includes("No required secrets"), false)
})

test("uses identity, not incidental README examples, for NEAR technical tags", () => {
  assert.equal(inferCategory("near-rpc", "protocol integration"), "Web3")
  assert.equal(
    inferCategory("legal-review", "Review a vendor contract"),
    "Dev Tools"
  )
  assert.equal(
    inferToolTags("near-indexer", {}, "Indexes protocol activity").includes(
      "NEAR"
    ),
    true
  )
  assert.equal(
    inferToolTags("coingecko", {}, "Get a historical chart for NEAR").includes(
      "NEAR"
    ),
    false
  )
})
