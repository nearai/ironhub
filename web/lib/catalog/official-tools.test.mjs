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

test("official tool schemas retain their manifest paths and use proxy URLs", () => {
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
})

test("only relative package asset paths are publishable", () => {
  assert.equal(
    isPublishableArtifactPath("schemas/firecrawl/invoke.input.v1.json"),
    true
  )
  assert.equal(isPublishableArtifactPath("../secret.json"), false)
  assert.equal(isPublishableArtifactPath("/schemas/input.json"), false)
  assert.equal(isPublishableArtifactPath("schemas/input file.json"), false)
})
