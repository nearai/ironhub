import assert from "node:assert/strict"
import test from "node:test"

import { isExtensionAssetPath } from "./ironclaw-contract.ts"
import {
  officialToolEntries,
  officialToolEntry,
} from "./official-tools.ts"

const artifact = (name) => ({
  url: `https://github.com/nearai/ironhub/releases/download/test/${name}`,
  size_bytes: 1,
  sha256: name.padEnd(64, "0"),
})

test("official tool assets retain their manifest paths and use proxy URLs", () => {
  const tool = officialToolEntry(
    {
      name: "firecrawl",
      version: "0.1.0",
      wasm: artifact("wasm"),
      capabilities: artifact("capabilities"),
      manifest: artifact("manifest"),
      schemas: {
        "schemas/firecrawl/invoke.input.v1.json": artifact("input"),
        "schemas/firecrawl/raw_output.v1.json": artifact("output"),
      },
      prompts: {
        "prompts/firecrawl/invoke.md": artifact("prompt"),
      },
    },
    (url) => `https://hub.ironclaw.com/artifact/${encodeURIComponent(url)}`
  )

  assert.deepEqual(Object.keys(tool.schemas ?? {}).sort(), [
    "schemas/firecrawl/invoke.input.v1.json",
    "schemas/firecrawl/raw_output.v1.json",
  ])
  assert.match(
    tool.schemas["schemas/firecrawl/invoke.input.v1.json"].url,
    /^https:\/\/hub\.ironclaw\.com\/artifact\//
  )
  assert.deepEqual(Object.keys(tool.prompts ?? {}), [
    "prompts/firecrawl/invoke.md",
  ])
  assert.match(
    tool.prompts["prompts/firecrawl/invoke.md"].url,
    /^https:\/\/hub\.ironclaw\.com\/artifact\//
  )
})

// The predicate itself lives in ironclaw-contract.ts and is tested there; this
// asserts only that the public path routes through that one definition rather
// than through a second copy, which is what let the two catalog paths disagree.
test("only relative package asset paths are publishable", () => {
  assert.equal(
    isExtensionAssetPath("schemas/firecrawl/invoke.input.v1.json"),
    true
  )
  assert.equal(isExtensionAssetPath("../secret.json"), false)
  assert.equal(isExtensionAssetPath("/schemas/input.json"), false)
  assert.equal(isExtensionAssetPath("schemas/input file.json"), false)
  assert.equal(isExtensionAssetPath("schemas/./input.json"), false)
  assert.equal(isExtensionAssetPath("schemas//input.json"), false)
})

test("a tool past the schema cap is omitted from the manifest, never truncated", () => {
  const schemas = {}
  for (let index = 0; index < 40; index += 1) {
    schemas[`schemas/attio/field${String(index).padStart(2, "0")}.json`] =
      artifact(`field${index}`)
  }

  const logged = captureErrors(() =>
    officialToolEntry(
      {
        name: "attio",
        version: "0.1.0",
        wasm: artifact("wasm"),
        capabilities: artifact("capabilities"),
        schemas,
      },
      (url) => url
    )
  )

  // Truncating to 32 would publish an entry the agent refuses, because it
  // compares the published asset set against the set the extension manifest
  // declares and requires equality (C9). Omission is the only answer that does
  // not ship a guaranteed install failure dressed as a success.
  assert.equal(logged.result, null)
  assert.equal(logged.errors.length, 1)
  assert.match(logged.errors[0], /^Omitting tool attio/)
  assert.match(logged.errors[0], /40 schema artifacts/)
  assert.match(logged.errors[0], /limit of 32/)
})

test("a tool past the prompt cap is omitted from the manifest", () => {
  const prompts = {}
  for (let index = 0; index < 65; index += 1) {
    prompts[`prompts/attio/p${String(index).padStart(2, "0")}.md`] =
      artifact(`p${index}`)
  }

  const logged = captureErrors(() =>
    officialToolEntry(
      {
        name: "attio",
        version: "0.1.0",
        wasm: artifact("wasm"),
        capabilities: artifact("capabilities"),
        prompts,
      },
      (url) => url
    )
  )

  assert.equal(logged.result, null)
  assert.match(logged.errors[0], /65 prompt artifacts/)
  assert.match(logged.errors[0], /limit of 64/)
})

test("a tool exactly at each cap is published", () => {
  const schemas = {}
  for (let index = 0; index < 32; index += 1) {
    schemas[`schemas/attio/f${String(index).padStart(2, "0")}.json`] =
      artifact(`f${index}`)
  }
  const prompts = {}
  for (let index = 0; index < 64; index += 1) {
    prompts[`prompts/attio/p${String(index).padStart(2, "0")}.md`] =
      artifact(`p${index}`)
  }

  const tool = officialToolEntry(
    {
      name: "attio",
      version: "0.1.0",
      wasm: artifact("wasm"),
      capabilities: artifact("capabilities"),
      schemas,
      prompts,
    },
    (url) => url
  )

  assert.equal(Object.keys(tool.schemas).length, 32)
  assert.equal(Object.keys(tool.prompts).length, 64)
})

test("a tool with an unpublishable asset path is omitted, not published without it", () => {
  const logged = captureErrors(() =>
    officialToolEntry(
      {
        name: "attio",
        version: "0.1.0",
        wasm: artifact("wasm"),
        capabilities: artifact("capabilities"),
        schemas: {
          "schemas/attio/ok.json": artifact("ok"),
          "../escape.json": artifact("escape"),
        },
      },
      (url) => url
    )
  )

  // Publishing the tool minus the offending asset is the same defect as
  // truncation: a proper subset of the declared set, which cannot install.
  assert.equal(logged.result, null)
  assert.match(logged.errors[0], /^Omitting tool attio/)
  assert.match(logged.errors[0], /"\.\.\/escape\.json"/)
})

test("published asset maps are ordered by path", () => {
  const tool = officialToolEntry(
    {
      name: "attio",
      version: "0.1.0",
      wasm: artifact("wasm"),
      capabilities: artifact("capabilities"),
      schemas: {
        "schemas/b.json": artifact("b"),
        "schemas/a.json": artifact("a"),
      },
    },
    (url) => url
  )

  assert.deepEqual(Object.keys(tool.schemas), [
    "schemas/a.json",
    "schemas/b.json",
  ])
})

test("a tool with no assets omits both fields rather than emitting empty maps", () => {
  const tool = officialToolEntry(
    {
      name: "attio",
      version: "0.1.0",
      wasm: artifact("wasm"),
      capabilities: artifact("capabilities"),
    },
    (url) => url
  )

  // `"schemas": {}` is a claim about the asset set, and C9 compares sets --
  // making no claim and claiming an empty one are not the same thing.
  assert.equal("schemas" in tool, false)
  assert.equal("prompts" in tool, false)
})

test("an over-cap tool is absent from the manifest while every other tool still publishes", () => {
  const overCapSchemas = {}
  for (let index = 0; index < 50; index += 1) {
    overCapSchemas[`schemas/github/op${String(index).padStart(2, "0")}.json`] =
      artifact(`op${index}`)
  }
  const tool = (name, extra = {}) => ({
    name,
    version: "0.1.0",
    wasm: artifact("wasm"),
    capabilities: artifact("capabilities"),
    ...extra,
  })

  // `crates/extensions/packages/github` really does declare 50 schema refs
  // against a cap of 32, so this is the shape of the live upstream document,
  // not a synthetic edge case.
  const logged = captureErrors(() =>
    officialToolEntries(
      [
        tool("firecrawl", {
          schemas: { "schemas/firecrawl/in.json": artifact("in") },
        }),
        tool("github", { schemas: overCapSchemas }),
        tool("attio"),
      ],
      (url) => url
    )
  )

  // The request succeeds -- there is no throw -- and the catalog stays up.
  assert.deepEqual(
    logged.result.map((entry) => entry.name),
    ["firecrawl", "attio"]
  )
  assert.equal(logged.errors.length, 1)
  assert.match(logged.errors[0], /^Omitting tool github/)
  // The survivors are published in full, not defensively trimmed.
  assert.deepEqual(Object.keys(logged.result[0].schemas), [
    "schemas/firecrawl/in.json",
  ])
})

/** Runs `fn` with console.error captured, so a log assertion is not noise. */
function captureErrors(fn) {
  const errors = []
  const original = console.error
  console.error = (message) => errors.push(String(message))
  try {
    return { result: fn(), errors }
  } finally {
    console.error = original
  }
}
