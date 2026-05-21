import {
  createKeyFingerprint,
  decryptSharedKey,
  encryptSharedKey,
  hashNonce,
  signInstallPayload,
} from "@/lib/agent-installations/crypto"
import {
  createInstallPayload,
  createNonce,
  createRecordId,
  signAgentRegistration,
} from "@/lib/agent-installations/protocol"
import type {
  AgentInstallationInput,
  AgentInstallationView,
} from "@/lib/agent-installations/types"
import {
  validateAgentUrl,
  validateLabel,
  validateSharedKey,
} from "@/lib/agent-installations/validation"
import { getMarketplaceCatalogItem } from "@/lib/catalog/server"
import { prisma } from "@/lib/db"

type AgentInstallationRow = {
  id: string
  label: string
  agentUrl: string
  encryptedSharedKey: string
  iv: string
  authTag: string
  keyFingerprint: string
  isDefault: boolean
  verifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

type InstallRedirectInput = {
  slug: string
  version: string
  userId: string
  agentInstallationId: string
  ts: number
  nonce: string
  sig: string
}

export function toAgentInstallationView(
  row: AgentInstallationRow
): AgentInstallationView {
  return {
    id: row.id,
    label: row.label,
    agentUrl: row.agentUrl,
    keyFingerprint: row.keyFingerprint,
    isDefault: row.isDefault,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function listAgentInstallations(userId: string) {
  const rows = await prisma.agentInstallation.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  })

  return rows.map(toAgentInstallationView)
}

export async function createAgentInstallation(
  userId: string,
  input: AgentInstallationInput
) {
  const id = createRecordId()
  const label = validateLabel(input.label)
  const agentUrl = await validateAgentUrl(input.agentUrl)
  const sharedKey = validateSharedKey(input.sharedKey)
  const existing = await listAgentInstallations(userId)
  const isDefault = input.isDefault ?? existing.length === 0

  await registerAgentInstallation({ agentUrl, id, sharedKey, userId })

  if (isDefault) {
    await clearDefaultAgentInstallation(userId)
  }

  const encrypted = encryptSharedKey(sharedKey)
  const row = await prisma.agentInstallation.create({
    data: {
      id,
      userId,
      label,
      agentUrl,
      ...encrypted,
      keyFingerprint: createKeyFingerprint(sharedKey),
      isDefault,
      verifiedAt: new Date(),
      updatedAt: new Date(),
    },
  })

  return toAgentInstallationView(row)
}

export async function updateAgentInstallation(
  userId: string,
  id: string,
  input: Partial<AgentInstallationInput>
) {
  const current = await getOwnedAgentInstallation(userId, id)
  const nextLabel = input.label ? validateLabel(input.label) : current.label
  const nextAgentUrl = input.agentUrl
    ? await validateAgentUrl(input.agentUrl)
    : current.agentUrl
  const nextSharedKey = input.sharedKey
    ? validateSharedKey(input.sharedKey)
    : decryptSharedKey(current)
  const encrypted = input.sharedKey
    ? encryptSharedKey(nextSharedKey)
    : {
        encryptedSharedKey: current.encryptedSharedKey,
        iv: current.iv,
        authTag: current.authTag,
      }

  if (input.agentUrl || input.sharedKey) {
    await registerAgentInstallation({
      agentUrl: nextAgentUrl,
      id,
      sharedKey: nextSharedKey,
      userId,
    })
  }

  if (input.isDefault) {
    await clearDefaultAgentInstallation(userId)
  }

  const row = await prisma.agentInstallation.update({
    where: { id },
    data: {
      label: nextLabel,
      agentUrl: nextAgentUrl,
      ...encrypted,
      keyFingerprint: createKeyFingerprint(nextSharedKey),
      isDefault: input.isDefault ?? current.isDefault,
      verifiedAt:
        input.agentUrl || input.sharedKey ? new Date() : current.verifiedAt,
      updatedAt: new Date(),
    },
  })

  return toAgentInstallationView(row)
}

export async function deleteAgentInstallation(userId: string, id: string) {
  await getOwnedAgentInstallation(userId, id)
  await prisma.agentInstallation.delete({ where: { id } })
}

export async function verifyAgentInstallation(userId: string, id: string) {
  const row = await getOwnedAgentInstallation(userId, id)
  const sharedKey = decryptSharedKey(row)

  await registerAgentInstallation({
    agentUrl: row.agentUrl,
    id,
    sharedKey,
    userId,
  })

  const updated = await prisma.agentInstallation.update({
    where: { id },
    data: { verifiedAt: new Date(), updatedAt: new Date() },
  })

  return toAgentInstallationView(updated)
}

export async function createInstallIntent(input: {
  userId: string
  slug: string
  agentInstallationId?: string
}) {
  const item = await getMarketplaceCatalogItem(input.slug)

  if (!item) {
    throw new Error("Marketplace Entry not found.")
  }

  const installation = await getInstallTarget(input)

  if (!installation.verifiedAt) {
    throw new Error("Agent Installation is not verified.")
  }

  const sharedKey = decryptSharedKey(installation)
  const nonce = createNonce()
  const ts = Math.floor(Date.now() / 1000)
  const expiresAt = new Date((ts + 300) * 1000)
  const payload = createInstallPayload({
    slug: item.slug,
    version: item.version,
    userId: input.userId,
    agentInstallationId: installation.id,
    ts,
    nonce,
  })
  const sig = signInstallPayload(sharedKey, payload)
  const redirectInput = {
    slug: item.slug,
    version: item.version,
    userId: input.userId,
    agentInstallationId: installation.id,
    ts,
    nonce,
    sig,
  }
  const redirectUrl = buildInstallRedirectUrl(
    installation.agentUrl,
    redirectInput
  )

  await prisma.installIntentRecord.create({
    data: {
      id: createRecordId(),
      userId: input.userId,
      agentInstallationId: installation.id,
      marketplaceSlug: item.slug,
      marketplaceVersion: item.version,
      nonceHash: hashNonce(nonce),
      expiresAt,
      redirectUrl: buildAuditRedirectUrl(installation.agentUrl, redirectInput),
      status: "issued",
    },
  })

  return { redirectUrl, message: payload, expiresAt: expiresAt.toISOString() }
}

async function getInstallTarget(input: {
  userId: string
  agentInstallationId?: string
}) {
  if (input.agentInstallationId) {
    return getOwnedAgentInstallation(input.userId, input.agentInstallationId)
  }

  return getDefaultAgentInstallation(input.userId)
}

async function getOwnedAgentInstallation(userId: string, id: string) {
  const row = await prisma.agentInstallation.findFirst({
    where: { id, userId },
  })

  if (!row) {
    throw new Error("Agent Installation not found.")
  }

  return row
}

async function getDefaultAgentInstallation(userId: string) {
  const row = await prisma.agentInstallation.findFirst({
    where: { userId, isDefault: true },
  })

  if (!row) {
    throw new Error("No default Agent Installation.")
  }

  return row
}

async function clearDefaultAgentInstallation(userId: string) {
  await prisma.agentInstallation.updateMany({
    where: { userId },
    data: { isDefault: false, updatedAt: new Date() },
  })
}

async function registerAgentInstallation(input: {
  agentUrl: string
  id: string
  sharedKey: string
  userId: string
}) {
  const ts = Math.floor(Date.now() / 1000)
  const nonce = createNonce()
  const { sig } = signAgentRegistration({
    sharedKey: input.sharedKey,
    userId: input.userId,
    agentInstallationId: input.id,
    ts,
    nonce,
  })
  const res = await fetch(new URL("/api/ironhub/register", input.agentUrl), {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userId: input.userId,
      agentInstallationId: input.id,
      ts,
      nonce,
      sig,
    }),
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) {
    throw new Error("Agent registration failed.")
  }
}

function buildInstallRedirectUrl(
  agentUrl: string,
  input: InstallRedirectInput
) {
  const params = new URLSearchParams({
    slug: input.slug,
    version: input.version,
    uid: input.userId,
    aid: input.agentInstallationId,
    ts: String(input.ts),
    nonce: input.nonce,
    sig: input.sig,
  })

  return `${agentUrl}/#/install/${input.slug}?${params.toString()}`
}

function buildAuditRedirectUrl(
  agentUrl: string,
  input: Omit<InstallRedirectInput, "nonce" | "sig">
) {
  const params = new URLSearchParams({
    slug: input.slug,
    version: input.version,
    uid: input.userId,
    aid: input.agentInstallationId,
    ts: String(input.ts),
    nonce: "redacted",
    sig: "redacted",
  })

  return `${agentUrl}/#/install/${input.slug}?${params.toString()}`
}
