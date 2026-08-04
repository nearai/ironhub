import assert from "node:assert/strict"
import test from "node:test"

import { normalizeToolSecurity } from "./manifest-normalization.ts"

test("normalizes top-level legacy bearer credentials", () => {
  const security = normalizeToolSecurity(
    {
      http: {
        allowlist: [{ host: "api.attio.com" }],
        credentials: {
          attio: {
            secret_name: "attio_api_key",
            location: { type: "bearer" },
            host_patterns: ["api.attio.com"],
          },
        },
      },
      secrets: { allowed_names: ["attio_api_key"] },
      auth: { secret_name: "attio_api_key", display_name: "Attio" },
    },
    ""
  )

  assert.equal(security.auth.model, "Bearer token")
  assert.deepEqual(security.auth.requiredSecrets, ["attio_api_key"])
  assert.deepEqual(security.networkHosts, ["api.attio.com"])
})

test("normalizes nested legacy credentials and optional setup secrets", () => {
  const security = normalizeToolSecurity(
    {
      capabilities: {
        http: {
          allowlist: [{ host: "store.example.com" }],
          credentials: {
            wp: {
              secret_name: "wp_app_password",
              location: { type: "basic" },
              optional: true,
            },
          },
        },
        secrets: { allowed_names: ["wp_app_password"] },
      },
      setup: {
        required_secrets: [{ name: "wp_app_password", optional: true }],
      },
    },
    ""
  )

  assert.equal(security.auth.model, "Basic authentication")
  assert.deepEqual(security.auth.requiredSecrets, [])
  assert.deepEqual(security.auth.optionalSecrets, ["wp_app_password"])
  assert.deepEqual(security.networkHosts, ["store.example.com"])
})

test("normalizes and deduplicates Reborn runtime security declarations", () => {
  const security = normalizeToolSecurity(
    { http: { allowlist: [{ host: "LEGACY_PLACEHOLDER" }] } },
    `schema_version = "reborn.extension_manifest.v2"

[capability_provider.tools]

[[capability_provider.tools.capabilities]]
id = "example.read"
effects = ["dispatch_capability", "network", "use_secret"]
default_permission = "allow"

[[capability_provider.tools.capabilities.runtime_credentials]]
handle = "example_token"
source = { type = "product_auth_account", provider = "example" }
audience = { scheme = "https", host_pattern = "api.example.com" }
target = { type = "header", name = "authorization", prefix = "Bearer " }
required = true

[[capability_provider.tools.capabilities]]
id = "example.write"
effects = ["dispatch_capability", "network", "use_secret", "external_write"]
default_permission = "ask"

[[capability_provider.tools.capabilities.runtime_credentials]]
handle = "example_token"
source = { type = "product_auth_account", provider = "example" }
audience = { scheme = "https", host_pattern = "api.example.com" }
target = { type = "header", name = "authorization", prefix = "Bearer " }
required = true
`
  )

  assert.equal(security.auth.model, "Bearer token")
  assert.equal(security.auth.credentials.length, 1)
  assert.equal(security.auth.credentials[0].required, true)
  assert.deepEqual(security.networkHosts, ["api.example.com"])
  assert.deepEqual(security.effects, [
    "dispatch_capability",
    "network",
    "use_secret",
    "external_write",
  ])
  assert.deepEqual(security.defaultPermissions, ["allow", "ask"])
})

test("identifies OAuth and truly credential-free tools", () => {
  const oauth = normalizeToolSecurity(
    {
      auth: {
        secret_name: "oauth_token",
        display_name: "Example",
        oauth: { use_pkce: true },
      },
    },
    ""
  )
  const publicTool = normalizeToolSecurity(
    { capabilities: { http: { allowlist: [{ host: "public.example.com" }] } } },
    ""
  )

  assert.equal(oauth.auth.model, "OAuth 2.0 with PKCE")
  assert.equal(publicTool.auth.model, "No credentials required")
  assert.deepEqual(publicTool.auth.credentials, [])
})
