import { randomUUID } from "node:crypto"

import { prisma } from "../db"
import { Prisma } from "../prisma/client"

const ARTIFACT_TYPES = ["skill", "tool"] as const
const VISIBILITIES = ["private", "public"] as const

type CreatePrivateArtifactInput = {
  type: string
  name: string
  title: string
  version: string
  visibility?: string
  description?: string
  sourceUrl?: string
}

export const MUTABLE_ARTIFACT_FIELDS = [
  "title",
  "description",
  "visibility",
  "sourceUrl",
] as const

type UpdatePrivateArtifactInput = {
  title?: string
  description?: string | null
  visibility?: string
  sourceUrl?: string | null
}

// Never select storageKey here — it's an internal S3 object pointer, not
// something the client needs or should see.
const CONTENT_SUMMARY_SELECT = {
  kind: true,
  sizeBytes: true,
  sha256: true,
  createdAt: true,
} as const

export async function listPrivateArtifacts(organizationId: string) {
  return prisma.privateArtifact.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    include: { content: { select: CONTENT_SUMMARY_SELECT } },
  })
}

export async function getPrivateArtifact(organizationId: string, id: string) {
  const artifact = await prisma.privateArtifact.findFirst({
    where: { id, organizationId },
    include: { content: { select: CONTENT_SUMMARY_SELECT } },
  })

  if (!artifact) {
    throw new Response("Artifact not found", { status: 404 })
  }

  return artifact
}

export async function createPrivateArtifact(
  organizationId: string,
  userId: string,
  input: CreatePrivateArtifactInput
) {
  assertValidArtifactName(input.name)
  assertValidArtifactVersion(input.version)
  assertMaxLength(input.title, "title", 200)
  if (input.description) assertMaxLength(input.description, "description", 4000)
  if (input.sourceUrl) assertHttpUrl(input.sourceUrl, "sourceUrl")
  const type = assertEnum(input.type, ARTIFACT_TYPES, "type")
  const visibility = input.visibility
    ? assertEnum(input.visibility, VISIBILITIES, "visibility")
    : "private"

  try {
    return await prisma.privateArtifact.create({
      data: {
        id: randomUUID(),
        organizationId,
        createdById: userId,
        type,
        name: input.name,
        title: input.title,
        version: input.version,
        visibility,
        description: input.description,
        sourceUrl: input.sourceUrl,
      },
    })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Response(
        "An artifact with this name and version already exists in this organization.",
        { status: 409 }
      )
    }
    throw error
  }
}

export async function updatePrivateArtifact(
  organizationId: string,
  id: string,
  input: UpdatePrivateArtifactInput
) {
  const artifact = await getPrivateArtifact(organizationId, id)

  const data: Prisma.PrivateArtifactUpdateInput = {}

  if (input.title !== undefined) {
    assertMaxLength(input.title, "title", 200)
    data.title = input.title
  }
  if (input.description !== undefined) {
    if (input.description) assertMaxLength(input.description, "description", 4000)
    data.description = input.description
  }
  if (input.sourceUrl !== undefined) {
    if (input.sourceUrl) assertHttpUrl(input.sourceUrl, "sourceUrl")
    data.sourceUrl = input.sourceUrl
  }
  if (input.visibility !== undefined) {
    data.visibility = assertEnum(input.visibility, VISIBILITIES, "visibility")
  }

  return prisma.privateArtifact.update({
    where: { id: artifact.id },
    data,
  })
}

export async function deletePrivateArtifact(organizationId: string, id: string) {
  const artifact = await getPrivateArtifact(organizationId, id)
  await prisma.privateArtifact.delete({ where: { id: artifact.id } })
  return artifact
}

const REQUIRED_CONTENT_KINDS_BY_TYPE: Record<string, readonly string[]> = {
  tool: ["wasm", "capabilities"],
  skill: ["skill_md"],
}

/**
 * Verifies the artifact has every content kind required by its type before
 * an install-link token is minted, so a token is never handed out for a
 * manifest fetch that is guaranteed to fail.
 */
export async function assertArtifactContentComplete(
  organizationId: string,
  id: string
) {
  const artifact = await prisma.privateArtifact.findFirst({
    where: { id, organizationId },
    select: { id: true, type: true, content: { select: { kind: true } } },
  })
  if (!artifact) {
    throw new Response("Artifact not found", { status: 404 })
  }

  const required = REQUIRED_CONTENT_KINDS_BY_TYPE[artifact.type]
  if (!required) {
    throw new Response(`Unsupported artifact type: ${artifact.type}`, {
      status: 409,
    })
  }

  const present = new Set(artifact.content.map((c) => c.kind))
  const missing = required.filter((kind) => !present.has(kind))
  if (missing.length > 0) {
    throw new Response(
      `Artifact is missing required content: ${missing.join(", ")}`,
      { status: 409 }
    )
  }
}

export async function deletePrivateArtifactContentRow(
  organizationId: string,
  artifactId: string,
  kind: string
) {
  const content = await prisma.privateArtifactContent.findFirst({
    where: { artifactId, kind, artifact: { organizationId } },
    select: { id: true },
  })
  if (!content) {
    throw new Response("Content not found", { status: 404 })
  }

  await prisma.privateArtifactContent.delete({ where: { id: content.id } })
}

function assertValidArtifactName(name: string) {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(name)) {
    throw new Response(
      "name must start with a lowercase letter or digit and contain only lowercase letters, digits, '-', and '_'",
      { status: 400 }
    )
  }
}

function assertValidArtifactVersion(version: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,63}$/.test(version)) {
    throw new Response(
      "version must be 1-64 characters of letters, digits, '.', '_', '+', or '-'",
      { status: 400 }
    )
  }
}

function assertMaxLength(value: string, field: string, max: number) {
  if (value.length > max) {
    throw new Response(`${field} must be at most ${max} characters`, { status: 400 })
  }
}

function assertHttpUrl(value: string, field: string) {
  let parsed: URL

  try {
    parsed = new URL(value)
  } catch {
    throw new Response(`${field} must be a valid URL`, { status: 400 })
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Response(`${field} must use http or https`, { status: 400 })
  }
}

function assertEnum<T extends string>(
  value: string,
  allowed: readonly T[],
  field: string
): T {
  if (!allowed.includes(value as T)) {
    throw new Response(`Invalid ${field}: ${value}`, { status: 400 })
  }

  return value as T
}
