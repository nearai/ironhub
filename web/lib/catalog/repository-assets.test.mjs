import assert from "node:assert/strict"
import path from "node:path"
import test from "node:test"

import { readRepositoryImageAsset } from "./repository-assets.server.ts"

const repoRoot = path.resolve(process.cwd(), "..")

test("reads a repository-contained tool image with an explicit content type", async () => {
  const asset = await readRepositoryImageAsset(repoRoot, "tool", "coingecko", [
    "screenshot.jpg",
  ])

  assert.equal(asset?.contentType, "image/jpeg")
  assert.ok((asset?.bytes.byteLength ?? 0) > 0)
})

test("rejects traversal and non-image repository files", async () => {
  assert.equal(
    await readRepositoryImageAsset(repoRoot, "tool", "coingecko", [
      "..",
      "README.md",
    ]),
    null
  )
  assert.equal(
    await readRepositoryImageAsset(repoRoot, "tool", "coingecko", [
      "README.md",
    ]),
    null
  )
})

test("rejects unknown catalog kinds and unsafe slugs", async () => {
  assert.equal(
    await readRepositoryImageAsset(repoRoot, "collection", "coingecko", [
      "screenshot.jpg",
    ]),
    null
  )
  assert.equal(
    await readRepositoryImageAsset(repoRoot, "tool", "../coingecko", [
      "screenshot.jpg",
    ]),
    null
  )
})
