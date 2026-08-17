import { randomUUID } from "node:crypto"

import { CATEGORIES } from "../catalog/inference"
import { prisma } from "../db"
import { Prisma } from "../prisma/client"
import { getObjectStream } from "../storage"

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
  category?: string
}

export const MUTABLE_ARTIFACT_FIELDS = [
  "title",
  "description",
  "visibility",
  "sourceUrl",
  "category",
] as const

type UpdatePrivateArtifactInput = {
  title?: string
  description?: string | null
  visibility?: string
  sourceUrl?: string | null
  category?: string | null
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
  const sourceUrl = normalizeOptionalField(input.sourceUrl)
  if (sourceUrl) assertHttpUrl(sourceUrl, "sourceUrl")
  const category = normalizeOptionalField(input.category)
  if (category) assertEnum(category, CATEGORIES, "category")
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
        sourceUrl,
        category,
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
    const sourceUrl = normalizeOptionalField(input.sourceUrl)
    if (sourceUrl) assertHttpUrl(sourceUrl, "sourceUrl")
    data.sourceUrl = sourceUrl
  }
  if (input.category !== undefined) {
    const category = normalizeOptionalField(input.category)
    if (category) assertEnum(category, CATEGORIES, "category")
    data.category = category
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

/**
 * Publishing requires the same content completeness the install-link token
 * already enforces, plus a category so the artifact can be browsed/filtered
 * once public. Both preconditions fail with 409 naming what's missing;
 * `status` never advances past `draft` until they hold.
 */
export async function publishPrivateArtifact(organizationId: string, id: string) {
  const artifact = await getPrivateArtifact(organizationId, id)
  await assertArtifactContentComplete(organizationId, id)
  if (!artifact.category) {
    throw new Response("Artifact cannot be published: category is not set", {
      status: 409,
    })
  }

  return prisma.privateArtifact.update({
    where: { id: artifact.id },
    data: { status: "published" },
    include: { content: { select: CONTENT_SUMMARY_SELECT } },
  })
}

export async function unpublishPrivateArtifact(organizationId: string, id: string) {
  const artifact = await getPrivateArtifact(organizationId, id)

  return prisma.privateArtifact.update({
    where: { id: artifact.id },
    data: { status: "draft" },
    include: { content: { select: CONTENT_SUMMARY_SELECT } },
  })
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

export type ArtifactCheck = {
  id: string
  label: string
  status: "pass" | "warn" | "fail"
  detail: string
}

/**
 * Computes the review checklist shown on the manage page entirely from
 * server-observed state — content rows, category, sourceUrl, and env config
 * — so publish readiness is never fabricated on the client.
 */
export async function getArtifactChecks(
  organizationId: string,
  id: string
): Promise<{ checks: ArtifactCheck[]; publishable: boolean }> {
  const artifact = await prisma.privateArtifact.findFirst({
    where: { id, organizationId },
    select: {
      id: true,
      type: true,
      category: true,
      sourceUrl: true,
      content: { select: { kind: true } },
    },
  })
  if (!artifact) {
    throw new Response("Artifact not found", { status: 404 })
  }

  const presentKinds = new Set(artifact.content.map((c) => c.kind))
  const required = REQUIRED_CONTENT_KINDS_BY_TYPE[artifact.type] ?? []
  const missing = required.filter((kind) => !presentKinds.has(kind))

  const checks: ArtifactCheck[] = [
    missing.length === 0
      ? {
          id: "content_complete",
          label: "Required content uploaded",
          status: "pass",
          detail: `All content required for a ${artifact.type} is present.`,
        }
      : {
          id: "content_complete",
          label: "Required content uploaded",
          status: "fail",
          detail: `Missing required content: ${missing.join(", ")}.`,
        },
  ]

  if (artifact.type === "tool") {
    checks.push(
      presentKinds.has("manifest_toml")
        ? {
            id: "manifest_present",
            label: "Extension manifest uploaded",
            status: "pass",
            detail: "manifest.toml is stored for this tool.",
          }
        : {
            id: "manifest_present",
            label: "Extension manifest uploaded",
            status: "warn",
            detail:
              "manifest.toml is not stored. Tools created before bundle ingest may lack it.",
          }
    )

    checks.push(
      await checkCapabilitiesValidJson(organizationId, id, presentKinds)
    )

    checks.push(
      presentKinds.has("wasm")
        ? {
            id: "wasm_present",
            label: "WASM module uploaded",
            status: "pass",
            detail: "wasm content is stored for this tool.",
          }
        : {
            id: "wasm_present",
            label: "WASM module uploaded",
            status: "fail",
            detail: "wasm content is missing.",
          }
    )
  }

  if (artifact.type === "skill") {
    checks.push(
      presentKinds.has("skill_md")
        ? {
            id: "skill_md_present",
            label: "SKILL.md uploaded",
            status: "pass",
            detail: "skill_md content is stored for this skill.",
          }
        : {
            id: "skill_md_present",
            label: "SKILL.md uploaded",
            status: "fail",
            detail: "skill_md content is missing.",
          }
    )
  }

  checks.push(
    artifact.category
      ? {
          id: "category_set",
          label: "Category set",
          status: "pass",
          detail: `Category is "${artifact.category}".`,
        }
      : {
          id: "category_set",
          label: "Category set",
          status: "fail",
          detail: "No category is set.",
        }
  )

  checks.push(
    artifact.sourceUrl
      ? {
          id: "repo_link_set",
          label: "Repository link set",
          status: "pass",
          detail: `Repository link is set to ${artifact.sourceUrl}.`,
        }
      : {
          id: "repo_link_set",
          label: "Repository link set",
          status: "warn",
          detail: "No repository link is set.",
        }
  )

  checks.push(
    process.env.IRONHUB_MANIFEST_SIGNING_KEY
      ? {
          id: "signing_key_configured",
          label: "Manifest signing key configured",
          status: "pass",
          detail: "IRONHUB_MANIFEST_SIGNING_KEY is configured.",
        }
      : {
          id: "signing_key_configured",
          label: "Manifest signing key configured",
          status: "warn",
          detail:
            "IRONHUB_MANIFEST_SIGNING_KEY is not set; install links will fail to sign.",
        }
  )

  return {
    checks,
    publishable: checks.every((check) => check.status !== "fail"),
  }
}

async function checkCapabilitiesValidJson(
  organizationId: string,
  artifactId: string,
  presentKinds: Set<string>
): Promise<ArtifactCheck> {
  const label = "Capabilities file is valid JSON"

  // Nothing was read, so nothing may report `pass` — the manage page renders
  // these verbatim and a green tick here would claim a file we never opened.
  // `content_complete` and `wasm_present` already fail on absence, so warn.
  if (!presentKinds.has("capabilities")) {
    return {
      id: "capabilities_valid_json",
      label,
      status: "warn",
      detail: "No capabilities content is stored, so it could not be checked.",
    }
  }

  const content = await prisma.privateArtifactContent.findFirst({
    where: { artifactId, kind: "capabilities", artifact: { organizationId } },
    select: { storageKey: true },
  })
  if (!content) {
    // Only reachable if the row was deleted between the two queries.
    return {
      id: "capabilities_valid_json",
      label,
      status: "warn",
      detail: "No capabilities content is stored, so it could not be checked.",
    }
  }

  // An unreachable object store is an infrastructure problem, not corrupt
  // data — reporting it as `fail` would tell the owner their file is broken
  // when it is fine, so the two failures stay distinguishable.
  let bytes: Buffer
  try {
    bytes = await streamToBuffer(await getObjectStream(content.storageKey))
  } catch (error) {
    console.error(
      `Failed to read capabilities content for artifact ${artifactId}:`,
      error
    )
    return {
      id: "capabilities_valid_json",
      label,
      status: "warn",
      detail: "Stored capabilities content could not be read from storage.",
    }
  }

  try {
    JSON.parse(bytes.toString("utf8"))
  } catch {
    return {
      id: "capabilities_valid_json",
      label,
      status: "fail",
      detail: "Stored capabilities content does not parse as JSON.",
    }
  }

  return {
    id: "capabilities_valid_json",
    label,
    status: "pass",
    detail: "Stored capabilities content parses as JSON.",
  }
}

// Mirrors the SdkStreamMixin handling in scripts/storage-smoke.ts — the S3
// client's Node runtime attaches transformToByteArray() to the Body stream.
async function streamToBuffer(stream: unknown): Promise<Buffer> {
  if (stream instanceof Uint8Array) {
    return Buffer.from(stream)
  }
  if (
    stream &&
    typeof stream === "object" &&
    "transformToByteArray" in stream &&
    typeof (stream as { transformToByteArray: unknown }).transformToByteArray ===
      "function"
  ) {
    const bytes = await (
      stream as { transformToByteArray: () => Promise<Uint8Array> }
    ).transformToByteArray()
    return Buffer.from(bytes)
  }
  throw new Error("Unsupported stream type returned by getObjectStream")
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

/**
 * A cleared form field arrives as `""`, which is "unset" rather than a value to
 * validate — collapse it to null so it clears the column instead of slipping
 * past the `if (value)` validator guards and storing an empty string.
 */
function normalizeOptionalField(value: string | null | undefined) {
  if (value === undefined) return undefined
  const trimmed = value?.trim() ?? ""
  return trimmed === "" ? null : trimmed
}

const ALLOWED_SOURCE_URL_HOSTS = new Set([
  "github.com",
  "gitlab.com",
  "bitbucket.org",
])

function assertHttpUrl(value: string, field: string) {
  let parsed: URL

  try {
    parsed = new URL(value)
  } catch {
    throw new Response(`${field} must be a valid URL`, { status: 400 })
  }

  // Reject embedded credentials: `https://looks-legit.com@github.com/x` passes
  // the host check but renders with an attacker-chosen prefix wherever the URL
  // is shown as link text.
  const host = parsed.hostname.replace(/^www\./, "")
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    !ALLOWED_SOURCE_URL_HOSTS.has(host)
  ) {
    throw new Response(
      `${field} must be an https URL on github.com, gitlab.com, or bitbucket.org`,
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
