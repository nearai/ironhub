import { createHash, randomUUID } from "node:crypto"

import { prisma } from "../db"

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
  const fields = { bytes, sha256, sizeBytes: bytes.length }

  return prisma.privateArtifactContent.upsert({
    where: { artifactId_kind: { artifactId, kind } },
    update: fields,
    create: { id: randomUUID(), artifactId, kind, ...fields },
    select: { kind: true, sha256: true, sizeBytes: true },
  })
}

export async function getArtifactContent(
  organizationId: string,
  artifactId: string,
  kind: ContentKind
) {
  const content = await prisma.privateArtifactContent.findFirst({
    where: { artifactId, kind, artifact: { organizationId } },
    select: { bytes: true, sizeBytes: true },
  })
  if (!content) {
    throw new Response("Content not found", { status: 404 })
  }
  return content
}
