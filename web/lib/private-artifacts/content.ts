import { createHash, randomUUID } from "node:crypto"

import { prisma } from "../db"
import { deleteObject, putObject } from "../storage"

const CONTENT_KINDS = ["skill_md", "wasm", "capabilities"] as const

export type ContentKind = (typeof CONTENT_KINDS)[number]

export const CONTENT_MEDIA_TYPES: Record<ContentKind, string> = {
  skill_md: "text/markdown; charset=utf-8",
  wasm: "application/wasm",
  capabilities: "application/json",
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
