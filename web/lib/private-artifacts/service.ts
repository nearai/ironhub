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
