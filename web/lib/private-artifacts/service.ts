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
  assertValidArtifactName(input.name)
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

function assertValidArtifactName(name: string) {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(name)) {
    throw new Response(
      "name must start with a lowercase letter or digit and contain only lowercase letters, digits, '-', and '_'",
      { status: 400 }
    )
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
