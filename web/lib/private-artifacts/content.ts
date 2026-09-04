import { createHash, randomUUID } from "node:crypto"

import {
  MAX_METADATA_BYTES,
  MAX_WASM_BYTES,
} from "@/lib/catalog/ironclaw-contract"

import { prisma } from "../db"
import { deleteObject, putObject } from "../storage"
import {
  PUBLISH_FREEZE_SELECT,
  assertArtifactContentUnfrozen,
} from "./publish-freeze"

const CONTENT_KINDS = [
  "skill_md",
  "wasm",
  "capabilities",
  "manifest_toml",
  "bundle_zip",
  "soul_md",
  "readme_md",
] as const

export type ContentKind = (typeof CONTENT_KINDS)[number]

export const CONTENT_MEDIA_TYPES: Record<ContentKind, string> = {
  skill_md: "text/markdown; charset=utf-8",
  wasm: "application/wasm",
  capabilities: "application/json",
  manifest_toml: "application/toml; charset=utf-8",
  bundle_zip: "application/zip",
  soul_md: "text/markdown; charset=utf-8",
  readme_md: "text/markdown; charset=utf-8",
}

/**
 * Kinds the hub stores and displays but never publishes to an agent.
 *
 * `readme_md` is the whole list, and it exists as a list so the exclusion is
 * a property of the kind rather than an omission in `manifest.ts` that a later
 * edit could quietly reverse. A soul's README is authored for the people
 * browsing the workspace; the agent would store it, never read it, and carry
 * it in the digest -- which is exactly the `capabilities.json` situation
 * ironclaw-contract.ts already carries a workaround for (design.md --
 * "`readme_md` is a content kind, not an asset, and never published"). One of
 * those is enough.
 */
export const HUB_ONLY_CONTENT_KINDS: ReadonlySet<ContentKind> = new Set([
  "readme_md",
])

// Per-kind ceilings. Each is the *smaller* of what the agent will accept for
// that kind and any tighter bound the hub imposes deliberately, so a payload
// that uploads here always installs there and one that cannot install is
// rejected at upload with a message naming the limit.
//
// The three kinds the agent bounds read their number from ironclaw-contract.ts
// rather than restating it. That is the whole point of the change these lines
// came from: `skill_md` used to sit at 5MB against the agent's 1MB, so a 2MB
// SKILL.md uploaded cleanly, signed cleanly, and failed at install with
// `artifact exceeds 1048576 byte cap` (design.md D7). `wasm` had the mirror
// problem in the safe direction -- 5MB against the agent's 16MB, rejecting
// modules the agent would have accepted for no stated reason.
//
// The two hub-only numbers stay hub-only:
//   * `manifest_toml` at 256KB is deliberately tighter than the agent's 1MB.
//     A manifest.toml is a declaration document, not a payload; 256KB is
//     already far past any real one, and the tighter bound costs nothing.
//   * `bundle_zip` never reaches an agent at all -- it is the upload envelope
//     ingest reads and discards. 25MB matches the compressed-size cap
//     bundle.ts enforces before storage is reached.
//
// `soul_md` is published as a skill document (manifest.ts), so it answers to
// the same agent ceiling `skill_md` does. `readme_md` is never published at
// all, but it is held to the same number anyway: it is the one bound that
// makes the pair storable as a unit, and a readme that dwarfs the document it
// describes is not a shape worth accommodating.
export const MAX_CONTENT_BYTES_BY_KIND: Record<ContentKind, number> = {
  skill_md: MAX_METADATA_BYTES,
  wasm: MAX_WASM_BYTES,
  capabilities: MAX_METADATA_BYTES,
  manifest_toml: 256 * 1024,
  bundle_zip: 25 * 1024 * 1024,
  soul_md: MAX_METADATA_BYTES,
  readme_md: MAX_METADATA_BYTES,
}

/**
 * Kinds served as a 302 to a short-lived presigned URL rather than proxied
 * through the Next process (design.md D4). Lives beside the kind table on
 * purpose: a new binary kind added above without being listed here would
 * silently start streaming multi-megabyte blobs through the server.
 */
export const REDIRECT_CONTENT_KINDS: ReadonlySet<ContentKind> = new Set([
  "wasm",
  "bundle_zip",
])

/**
 * A filename an owner would recognise when they download a stored file.
 *
 * The storage key is a UUID path, so without this the browser saves every
 * download under an opaque name. `skill_md`, `manifest_toml`, `soul_md` and
 * `readme_md` keep their canonical filenames (they are that file); the rest
 * are named after the artifact, matching how they arrive inside an uploaded
 * package.
 */
export function contentDownloadFilename(
  kind: ContentKind,
  artifactName: string
): string {
  const safeName =
    artifactName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") ||
    "download"

  switch (kind) {
    case "skill_md":
      return "SKILL.md"
    case "manifest_toml":
      return "manifest.toml"
    case "capabilities":
      return `${safeName}.capabilities.json`
    case "wasm":
      return `${safeName}.wasm`
    case "bundle_zip":
      return `${safeName}.zip`
    case "soul_md":
      return "SOUL.md"
    case "readme_md":
      return "README.md"
  }
}

/**
 * A soul is one free-form Markdown document with no frontmatter, no required
 * headers and no schema (design.md -- Context), so size and non-emptiness are
 * the only two things there are to check. This is the second of them.
 *
 * Whitespace-only is refused alongside genuinely empty because the two mean
 * the same thing to the agent and only one of them is visible to the author:
 * a soul is read as the first block of the system prompt, and a blank one
 * publishes, installs and digests cleanly while doing nothing at all. The
 * route's own zero-length guard fires earlier for the empty case; this is the
 * authoritative check both ingest paths inherit, the same way the size guard
 * above is.
 */
function assertSoulDocumentHasContent(kind: ContentKind, input: Uint8Array) {
  if (kind !== "soul_md") return
  if (new TextDecoder().decode(input).trim() !== "") return

  throw new Response("SOUL.md must have content", { status: 400 })
}

export function parseContentKind(value: string): ContentKind {
  if (!(CONTENT_KINDS as readonly string[]).includes(value)) {
    throw new Response(`Invalid content kind: ${value}`, { status: 400 })
  }
  return value as ContentKind
}

export function describeLimit(maxBytes: number): string {
  return maxBytes >= 1024 * 1024
    ? `${maxBytes / (1024 * 1024)}MB`
    : `${maxBytes / 1024}KB`
}

export function artifactContentStorageKey(
  organizationId: string,
  artifactId: string,
  kind: ContentKind
): string {
  return `private-artifacts/${organizationId}/${artifactId}/${kind}`
}

// The authoritative size guard: every write path (the direct content
// PUT route, and bundle ingest, which extracts several kinds out of one
// zip) funnels through this function, so this is the one place a kind's
// D3 limit cannot be bypassed. `PUT .../content/[kind]` also pre-checks
// before hashing (cheaper, and produces its own 413 naming the limit) --
// that early check is a fast path, not a substitute for this one, so the
// two ingest paths can never silently disagree about the same table.
export async function storeArtifactContent(
  organizationId: string,
  artifactId: string,
  kind: ContentKind,
  input: Uint8Array
) {
  const maxBytes = MAX_CONTENT_BYTES_BY_KIND[kind]
  if (input.length > maxBytes) {
    throw new Response(
      `Content exceeds the ${describeLimit(maxBytes)} limit for ${kind}`,
      { status: 413 }
    )
  }
  assertSoulDocumentHasContent(kind, input)

  const artifact = await prisma.privateArtifact.findFirst({
    where: { id: artifactId, organizationId },
    select: PUBLISH_FREEZE_SELECT,
  })
  if (!artifact) {
    throw new Response("Artifact not found", { status: 404 })
  }
  // Checked here rather than in the routes for the same reason the size limit
  // is: this is the single funnel every content write passes through, direct
  // PUT and bundle ingest alike, so a caller cannot be added that misses it.
  assertArtifactContentUnfrozen(artifact)

  const bytes = new Uint8Array(input)
  const sha256 = createHash("sha256").update(bytes).digest("hex")
  const storageKey = artifactContentStorageKey(organizationId, artifactId, kind)

  await putObject(storageKey, bytes, CONTENT_MEDIA_TYPES[kind])

  const fields = { storageKey, sha256, sizeBytes: bytes.length }

  return prisma.privateArtifactContent.upsert({
    where: { artifactId_kind: { artifactId, kind } },
    update: fields,
    create: { id: randomUUID(), artifactId, kind, ...fields },
    select: { kind: true, sha256: true, sizeBytes: true },
  })
}

export async function getArtifactContentMetadata(
  organizationId: string,
  artifactId: string,
  kind: ContentKind
) {
  const content = await prisma.privateArtifactContent.findFirst({
    where: { artifactId, kind, artifact: { organizationId } },
    select: { storageKey: true, sizeBytes: true },
  })
  if (!content) {
    throw new Response("Content not found", { status: 404 })
  }
  return content
}

export async function deleteArtifactContent(
  organizationId: string,
  artifactId: string,
  kind: ContentKind
) {
  const artifact = await prisma.privateArtifact.findFirst({
    where: { id: artifactId, organizationId },
    select: PUBLISH_FREEZE_SELECT,
  })
  if (!artifact) {
    throw new Response("Artifact not found", { status: 404 })
  }
  // Removing a file changes what the published version resolves to just as
  // much as replacing one does, so it answers to the same freeze.
  assertArtifactContentUnfrozen(artifact)

  const content = await prisma.privateArtifactContent.findFirst({
    where: { artifactId, kind, artifact: { organizationId } },
    select: { id: true, storageKey: true },
  })
  if (!content) {
    throw new Response("Content not found", { status: 404 })
  }

  await prisma.privateArtifactContent.delete({ where: { id: content.id } })

  try {
    await deleteObject(content.storageKey)
  } catch (error) {
    console.error(
      `Failed to delete storage object for content ${content.id} (${content.storageKey})`,
      error
    )
  }
}
