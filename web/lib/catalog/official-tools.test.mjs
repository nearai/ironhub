import assert from "node:assert/strict"
import test from "node:test"

import {
  isPublishableArtifactPath,
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

test("only relative package asset paths are publishable", () => {
  assert.equal(
    isPublishableArtifactPath("schemas/firecrawl/invoke.input.v1.json"),
    true
  )
  assert.equal(isPublishableArtifactPath("../secret.json"), false)
  assert.equal(isPublishableArtifactPath("/schemas/input.json"), false)
  assert.equal(isPublishableArtifactPath("schemas/input file.json"), false)
  assert.equal(isPublishableArtifactPath("schemas/./input.json"), false)
  assert.equal(isPublishableArtifactPath("schemas//input.json"), false)
})

test("schema artifacts past the client cap are dropped, not published", () => {
  const schemas = {}
  for (let index = 0; index < 40; index += 1) {
    schemas[`schemas/attio/field${String(index).padStart(2, "0")}.json`] =
      artifact(`field${index}`)
  }
  const tool = officialToolEntry(
    {
      name: "attio",
      version: "0.1.0",
      wasm: artifact("wasm"),
      capabilities: artifact("capabilities"),
      schemas,
    },
    (url) => url
  )

  const published = Object.keys(tool.schemas ?? {})
  assert.equal(published.length, 32)
  assert.deepEqual(published, [...published].sort())
  assert.equal(published[0], "schemas/attio/field00.json")
})

test("a tool whose schema paths are all unpublishable omits the field", () => {
  const tool = officialToolEntry(
    {
      name: "attio",
      version: "0.1.0",
      wasm: artifact("wasm"),
      capabilities: artifact("capabilities"),
      schemas: {
        "../escape.json": artifact("escape"),
        "schemas/./input.json": artifact("dot"),
        "schemas//input.json": artifact("empty"),
      },
    },
    (url) => url
  )

  assert.equal("schemas" in tool, false)
})

test("a tool whose prompt paths are all unpublishable omits the field", () => {
  const tool = officialToolEntry(
    {
      name: "youtube",
      version: "0.2.0",
      wasm: artifact("wasm"),
      capabilities: artifact("capabilities"),
      prompts: {
        "../escape.md": artifact("escape"),
        "prompts/./invoke.md": artifact("dot"),
        "prompts//invoke.md": artifact("empty"),
      },
    },
    (url) => url
  )

  assert.equal("prompts" in tool, false)
})
