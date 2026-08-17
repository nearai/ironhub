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

export function parseContentKind(value: string): ContentKind {
  if (!(CONTENT_KINDS as readonly string[]).includes(value)) {
    throw new Response(`Invalid content kind: ${value}`, { status: 400 })
  }
  return value as ContentKind
}

export function artifactContentStorageKey(
  organizationId: string,
  artifactId: string,
  kind: ContentKind
): string {
  return `private-artifacts/${organizationId}/${artifactId}/${kind}`
}

export async function storeArtifactContent(
  organizationId: string,
  artifactId: string,
  kind: ContentKind,
  input: Uint8Array
) {
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
