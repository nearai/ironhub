import { createHash, randomUUID } from "node:crypto"

import { prisma } from "../db"
import { deleteObject, putObject } from "../storage"

const CONTENT_KINDS = [
  "skill_md",
  "wasm",
  "capabilities",
  "manifest_toml",
  "bundle_zip",
] as const

export type ContentKind = (typeof CONTENT_KINDS)[number]

export const CONTENT_MEDIA_TYPES: Record<ContentKind, string> = {
  skill_md: "text/markdown; charset=utf-8",
  wasm: "application/wasm",
  capabilities: "application/json",
  manifest_toml: "application/toml; charset=utf-8",
  bundle_zip: "application/zip",
}

// Per-kind ceilings (design.md D3): manifest_toml and bundle_zip get their
// own limits rather than sharing the flat 5MB cap used by the original three
// kinds. bundle_zip's 25MB matches the compressed-size cap bundle.ts already
// enforces before storage is ever reached.
export const MAX_CONTENT_BYTES_BY_KIND: Record<ContentKind, number> = {
  skill_md: 5 * 1024 * 1024,
  wasm: 5 * 1024 * 1024,
  capabilities: 5 * 1024 * 1024,
  manifest_toml: 256 * 1024,
  bundle_zip: 25 * 1024 * 1024,
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

  const artifact = await prisma.privateArtifact.findFirst({
    where: { id: artifactId, organizationId },
    select: { id: true },
  })
  if (!artifact) {
    throw new Response("Artifact not found", { status: 404 })
  }

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
