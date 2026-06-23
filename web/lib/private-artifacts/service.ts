import { randomUUID } from "node:crypto"

import { prisma } from "../db"

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

export async function listPrivateArtifacts(organizationId: string) {
  return prisma.privateArtifact.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
  })
}

export async function getPrivateArtifact(organizationId: string, id: string) {
  const artifact = await prisma.privateArtifact.findFirst({
    where: { id, organizationId },
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
  const type = assertEnum(input.type, ARTIFACT_TYPES, "type")
  const visibility = input.visibility
    ? assertEnum(input.visibility, VISIBILITIES, "visibility")
    : "private"

  return prisma.privateArtifact.create({
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
