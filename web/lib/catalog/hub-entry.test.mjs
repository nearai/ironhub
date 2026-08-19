import assert from "node:assert/strict"
import test from "node:test"

import { hubToolEntry } from "./hub-entry.ts"

const artifact = (sha256) => ({ url: `https://hub.example/${sha256}`, size_bytes: 1, sha256 })

function baseInput(overrides = {}) {
  return {
    name: "firecrawl",
    version: "0.1.0",
    provenance: "private",
    wasm: artifact("wasm"),
    capabilities: artifact("capabilities"),
    ...overrides,
  }
}

test("an absent optional field is absent, not null and not an empty object", () => {
  // C9 compares the published asset set against the declared one, so
  // `"schemas": {}` is a claim about that set rather than the absence of one.
  const serialized = JSON.parse(JSON.stringify(hubToolEntry(baseInput())))

  for (const field of ["manifest", "schemas", "prompts"]) {
    assert.equal(field in serialized, false, `${field} should not be emitted`)
  }
})

test("an empty asset map is treated the same as no map at all", () => {
  const entry = hubToolEntry(baseInput({ schemas: {}, prompts: {}, manifest: null }))

  assert.equal("schemas" in entry, false)
  assert.equal("prompts" in entry, false)
  assert.equal("manifest" in entry, false)
})

test("asset maps are emitted in sorted-path order, matching the digest's order", () => {
  const entry = hubToolEntry(
    baseInput({
      schemas: {
        "schemas/b.json": artifact("b"),
        "schemas/a.json": artifact("a"),
        "schemas/A.json": artifact("A"),
      },
    })
  )

  // Bytewise, so uppercase sorts before lowercase -- the same comparison
  // Rust's BTreeMap<String, _> makes when the agent walks the entry.
  assert.deepEqual(Object.keys(entry.schemas), [
    "schemas/A.json",
    "schemas/a.json",
    "schemas/b.json",
  ])
})

test("crate_name and description fall back rather than being omitted", () => {
  const entry = hubToolEntry(baseInput())

  assert.equal(entry.crate_name, "firecrawl")
  assert.equal(entry.description, "")

  const named = hubToolEntry(
    baseInput({ crateName: "firecrawl_tool", description: "Scrapes." })
  )
  assert.equal(named.crate_name, "firecrawl_tool")
  assert.equal(named.description, "Scrapes.")
})
