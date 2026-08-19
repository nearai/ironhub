import assert from "node:assert/strict"
import { mock, test } from "node:test"

import {
  MAX_METADATA_BYTES,
  MAX_TOOL_PROMPT_ARTIFACTS,
  MAX_TOOL_SCHEMA_ARTIFACTS,
  MAX_WASM_BYTES,
} from "@/lib/catalog/ironclaw-contract"

let findFirstResult = null
let storedAssets = []
let storedObjects = new Map()

mock.module("../db", {
  namedExports: {
    prisma: {
      privateArtifact: { findFirst: async () => findFirstResult },
      privateArtifactAsset: { findMany: async () => storedAssets },
    },
  },
})

mock.module("../storage", {
  namedExports: {
    getObjectBytes: async (key) => {
      const value = storedObjects.get(key)
      if (value === undefined) throw new Error(`Object not found: ${key}`)
      return new TextEncoder().encode(value)
    },
    // Verification reads recorded metadata and one declaration document. It
    // must never open an artifact's bytes -- that is what the recorded
    // sha256/sizeBytes are for, and re-reading them here would let the check
    // and the published entry disagree about what was measured.
    getObjectStream: async () => {
      throw new Error("verification must not stream artifact bytes")
    },
    putObject: async () => {
      throw new Error("verification must not write to storage")
    },
    deleteObject: async () => {
      throw new Error("verification must not delete from storage")
    },
    getPresignedDownloadUrl: async () => {
      throw new Error("verification must not presign an object-store URL")
    },
  },
})

process.env.NEXT_PUBLIC_APP_URL = "https://hub.example"

const {
  assertPrivateArtifactPublishable,
  verifyPrivateArtifact,
} = await import("./verification.ts")

const MANIFEST_TOML_KEY = "private-artifacts/org-1/artifact-1/manifest_toml"
const SCHEMA_INPUT = "schemas/firecrawl/scrape.input.v1.json"
const SCHEMA_OUTPUT = "schemas/firecrawl/scrape.output.v1.json"
const PROMPT_DOC = "prompts/firecrawl/scrape.md"

function manifestToml(refs) {
  return refs
    .map(
      (ref, index) => `
[[tools]]
name = "op${index}"
${ref}
`
    )
    .join("\n")
}

const DEFAULT_MANIFEST_TOML = `
schema_version = "3"

[[tools]]
name = "scrape"
input_schema_ref = "${SCHEMA_INPUT}"
output_schema_ref = "${SCHEMA_OUTPUT}"
prompt_doc_ref = "${PROMPT_DOC}"
`

function content(kind, sizeBytes) {
  return {
    kind,
    sha256: `sha-${kind}`,
    sizeBytes,
    storageKey: `private-artifacts/org-1/artifact-1/${kind}`,
  }
}

function asset(kind, path, sizeBytes = path.length) {
  return {
    kind,
    path,
    storageKey: `private-artifacts/org-1/artifact-1/assets/${kind}/${path}`,
    sha256: `sha-${path}`,
    sizeBytes,
  }
}

/** A v3 tool declaring two schemas and one prompt, all stored, all in bounds. */
function completeToolFixture(overrides = {}) {
  findFirstResult = {
    id: "artifact-1",
    type: "tool",
    name: "firecrawl",
    version: "0.1.0",
    description: "desc",
    content: [content("wasm", 1024), content("manifest_toml", 512)],
    ...overrides,
  }
  storedObjects = new Map([[MANIFEST_TOML_KEY, DEFAULT_MANIFEST_TOML]])
  storedAssets = [
    asset("schema", SCHEMA_INPUT),
    asset("schema", SCHEMA_OUTPUT),
    asset("prompt", PROMPT_DOC),
  ]
}

function verify() {
  return verifyPrivateArtifact({
    organizationId: "org-1",
    artifactId: "artifact-1",
  })
}

// --- Task 7.3: a valid artifact is installable, a mismatched one is not -----

test("task 7.3: a fully valid artifact verifies clean", async () => {
  completeToolFixture()

  assert.deepEqual(await verify(), { ok: true, failures: [] })
})

test("task 7.3: a declared asset with no stored counterpart blocks the install and names the path", async () => {
  completeToolFixture()
  // The manifest still declares three assets; only two are stored. This is the
  // state a bundle uploaded before assets were persisted leaves behind, and
  // the state `PUT .../content/manifest_toml` can create on its own by
  // replacing the declaration document without an asset pass.
  storedAssets = [asset("schema", SCHEMA_INPUT), asset("prompt", PROMPT_DOC)]

  const { ok, failures } = await verify()

  assert.equal(ok, false)
  assert.equal(failures.length, 1)
  assert.equal(failures[0].id, "entry_publishable")
  assert.match(failures[0].message, new RegExp(SCHEMA_OUTPUT))
})

test("task 7.3: a stored asset the manifest does not declare is not a failure -- it is simply not published", async () => {
  completeToolFixture()
  // C9 is set equality, and the builder iterates the declared set, so an extra
  // stored asset is unreachable rather than published. Publishing it would be
  // the failure; storing it is not.
  storedAssets = [...storedAssets, asset("schema", "schemas/firecrawl/old.json")]

  assert.equal((await verify()).ok, true)
})

test("a missing required content kind is reported rather than thrown", async () => {
  completeToolFixture({ content: [content("manifest_toml", 512)] })

  const { ok, failures } = await verify()

  assert.equal(ok, false)
  assert.equal(failures[0].id, "entry_publishable")
  assert.match(failures[0].message, /wasm/)
})

test("assertPrivateArtifactPublishable throws a 409 naming every reason", async () => {
  completeToolFixture()
  storedAssets = []

  // Caught rather than asserted through `assert.rejects`: reading the body is
  // async, and a validation function that returns a promise is truthy whatever
  // it resolves to.
  let thrown = null
  try {
    await assertPrivateArtifactPublishable("org-1", "artifact-1")
  } catch (error) {
    thrown = error
  }

  assert.ok(thrown instanceof Response)
  assert.equal(thrown.status, 409)
  const body = await thrown.text()
  assert.match(body, /cannot be installed/)
  assert.match(body, new RegExp(SCHEMA_INPUT))
})

test("assertPrivateArtifactPublishable resolves for a valid artifact", async () => {
  completeToolFixture()

  await assertPrivateArtifactPublishable("org-1", "artifact-1")
})

// --- Task 10.4: size and count ceilings, measured against the agent's --------

test("task 10.4: a wasm module past the agent's 16MB ceiling blocks the install", async () => {
  completeToolFixture({
    content: [
      content("wasm", MAX_WASM_BYTES + 1),
      content("manifest_toml", 512),
    ],
  })

  const { ok, failures } = await verify()

  assert.equal(ok, false)
  assert.equal(failures[0].id, "wasm_size")
  assert.match(failures[0].message, new RegExp(String(MAX_WASM_BYTES)))
})

test("task 10.4: a wasm module at exactly the ceiling is publishable", async () => {
  completeToolFixture({
    content: [content("wasm", MAX_WASM_BYTES), content("manifest_toml", 512)],
  })

  assert.equal((await verify()).ok, true)
})

test("task 10.4: an oversized schema asset blocks the install and names the path", async () => {
  completeToolFixture()
  storedAssets = [
    asset("schema", SCHEMA_INPUT, MAX_METADATA_BYTES + 1),
    asset("schema", SCHEMA_OUTPUT),
    asset("prompt", PROMPT_DOC),
  ]

  const { ok, failures } = await verify()

  assert.equal(ok, false)
  assert.equal(failures[0].id, "asset_size")
  assert.match(failures[0].message, new RegExp(SCHEMA_INPUT))
})

test("task 10.4: an oversized manifest.toml blocks the install", async () => {
  completeToolFixture({
    content: [
      content("wasm", 1024),
      content("manifest_toml", MAX_METADATA_BYTES + 1),
    ],
  })

  assert.equal((await verify()).failures[0].id, "manifest_toml_size")
})

test("task 10.4: an oversized skill document blocks the install", async () => {
  findFirstResult = {
    id: "artifact-1",
    type: "skill",
    name: "my-skill",
    version: "0.1.0",
    description: "desc",
    content: [content("skill_md", MAX_METADATA_BYTES + 1)],
  }
  storedAssets = []
  storedObjects = new Map()

  const { ok, failures } = await verify()

  assert.equal(ok, false)
  assert.equal(failures[0].id, "skill_md_size")
  assert.match(failures[0].message, new RegExp(String(MAX_METADATA_BYTES)))
})

test("task 10.4: an in-bounds skill verifies clean", async () => {
  findFirstResult = {
    id: "artifact-1",
    type: "skill",
    name: "my-skill",
    version: "0.1.0",
    description: "desc",
    content: [content("skill_md", 4096)],
  }
  storedAssets = []
  storedObjects = new Map()

  assert.equal((await verify()).ok, true)
})

test("task 10.4: a tool past the agent's per-tool asset counts blocks the install", async () => {
  const paths = []
  const refs = []
  for (let index = 0; index <= MAX_TOOL_SCHEMA_ARTIFACTS; index += 1) {
    const path = `schemas/firecrawl/f${String(index).padStart(2, "0")}.json`
    paths.push(path)
    refs.push(`input_schema_ref = "${path}"`)
  }

  findFirstResult = {
    id: "artifact-1",
    type: "tool",
    name: "firecrawl",
    version: "0.1.0",
    description: "desc",
    content: [content("wasm", 1024), content("manifest_toml", 512)],
  }
  storedObjects = new Map([[MANIFEST_TOML_KEY, manifestToml(refs)]])
  storedAssets = paths.map((path) => asset("schema", path))

  const { ok, failures } = await verify()

  assert.equal(ok, false)
  assert.equal(failures[0].id, "schema_count")
  assert.match(
    failures[0].message,
    new RegExp(
      `${MAX_TOOL_SCHEMA_ARTIFACTS + 1} schema assets.*at most ${MAX_TOOL_SCHEMA_ARTIFACTS}`
    )
  )
})

test("the prompt cap is checked independently of the schema cap", async () => {
  const paths = []
  const refs = []
  for (let index = 0; index <= MAX_TOOL_PROMPT_ARTIFACTS; index += 1) {
    const path = `prompts/firecrawl/p${String(index).padStart(2, "0")}.md`
    paths.push(path)
    refs.push(`prompt_doc_ref = "${path}"`)
  }

  findFirstResult = {
    id: "artifact-1",
    type: "tool",
    name: "firecrawl",
    version: "0.1.0",
    description: "desc",
    content: [content("wasm", 1024), content("manifest_toml", 512)],
  }
  storedObjects = new Map([[MANIFEST_TOML_KEY, manifestToml(refs)]])
  storedAssets = paths.map((path) => asset("prompt", path))

  assert.equal((await verify()).failures[0].id, "prompt_count")
})

test("task 10.4: every failure is reported, not just the first", async () => {
  completeToolFixture({
    content: [
      content("wasm", MAX_WASM_BYTES + 1),
      content("manifest_toml", MAX_METADATA_BYTES + 1),
    ],
  })

  const ids = (await verify()).failures.map((failure) => failure.id)

  // An artifact with three problems should cost one round trip to fix, not
  // three.
  assert.deepEqual(ids, ["wasm_size", "manifest_toml_size"])
})

// --- Task 8: a misconfigured origin is reported, not thrown -----------------

test("task 8.1: a base URL the agent would reject is reported as its own failure", async () => {
  completeToolFixture()
  const original = process.env.NEXT_PUBLIC_APP_URL
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
  try {
    const { ok, failures } = await verify()

    assert.equal(ok, false)
    assert.equal(failures[0].id, "catalog_origin")
    assert.match(failures[0].message, /NEXT_PUBLIC_APP_URL/)
    // The artifact itself is sound, and the owner should be able to see that
    // rather than having every other check suppressed by a deployment problem.
    assert.equal(failures.length, 1)
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = original
  }
})

test("an explicitly supplied base URL and token are used as given", async () => {
  completeToolFixture()

  const result = await verifyPrivateArtifact({
    organizationId: "org-1",
    artifactId: "artifact-1",
    baseUrl: "https://other-hub.example",
    token: "tok",
  })

  assert.equal(result.ok, true)
})
