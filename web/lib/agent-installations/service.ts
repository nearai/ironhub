import http from "node:http"
import https from "node:https"

import {
  createKeyFingerprint,
  decryptSharedKey,
  encryptSharedKey,
  hashNonce,
  signInstallPayload,
} from "@/lib/agent-installations/crypto"
import {
  ARTIFACT_TOKEN_TTL_SECONDS,
  INSTALL_CLICK_THROUGH_WINDOW_SECONDS,
} from "@/lib/agent-installations/install-timing"
import {
  createInstallPayload,
  createNonce,
  createRecordId,
  signAgentRegistration,
} from "@/lib/agent-installations/protocol"
import type {
  AgentInstallationInput,
  AgentInstallationView,
  InstallArtifactType,
  InstallSource,
} from "@/lib/agent-installations/types"
import {
  resolvePublicAddresses,
  validateAgentUrl,
  validateLabel,
  validateSharedKey,
} from "@/lib/agent-installations/validation"
import { requireCatalogOriginBaseUrl } from "@/lib/catalog/catalog-origin"
import {
  skillEntryArtifactDigest,
  soulArtifactDigest,
  toolEntryArtifactDigest,
} from "@/lib/catalog/ironclaw-contract"
import { getMarketplaceCatalogItem } from "@/lib/catalog/server"
import { buildUnifiedManifest } from "@/lib/catalog/manifest.server"
import { prisma } from "@/lib/db"
import { buildPrivateArtifactEntry } from "@/lib/private-artifacts/manifest"
import { mintInstallTokenForArtifact } from "@/lib/private-artifacts/token"
import { assertPublishedEntryInstallable } from "@/lib/private-artifacts/verification"

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
  artifactDigest: string
  privateManifestUrl?: string
  manifestToken?: string
}

type ResolvedInstallArtifact = {
  slug: string
  version: string
  digest: string
  privateManifest?: { url: string; token: string }
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
  source: InstallSource
  type: InstallArtifactType
  agentInstallationId?: string
  organizationId?: string
}) {
  const target = await resolveInstallArtifact(input)
  const installation = await getInstallTarget(input)

  if (!installation.verifiedAt) {
    throw new Error("Agent Installation is not verified.")
  }

  const sharedKey = decryptSharedKey(installation)
  const nonce = createNonce()
  const ts = Math.floor(Date.now() / 1000)
  // The click-through deadline, and the only one the user can miss. `ts` is
  // covered by the HMAC below, so this expiry describes the same instant the
  // agent computes its own staleness against -- see install-timing.ts.
  const expiresAt = new Date((ts + INSTALL_CLICK_THROUGH_WINDOW_SECONDS) * 1000)
  const payload = createInstallPayload({
    slug: target.slug,
    version: target.version,
    userId: input.userId,
    agentInstallationId: installation.id,
    ts,
    nonce,
    artifactDigest: target.digest,
    privateManifestUrl: target.privateManifest?.url,
  })
  const sig = signInstallPayload(sharedKey, payload)
  const redirectInput: InstallRedirectInput = {
    slug: target.slug,
    version: target.version,
    userId: input.userId,
    agentInstallationId: installation.id,
    ts,
    nonce,
    sig,
    artifactDigest: target.digest,
    privateManifestUrl: target.privateManifest?.url,
    manifestToken: target.privateManifest?.token,
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
      marketplaceSlug: target.slug,
      marketplaceVersion: target.version,
      nonceHash: hashNonce(nonce),
      expiresAt,
      redirectUrl: buildAuditRedirectUrl(installation.agentUrl, redirectInput),
      status: "issued",
    },
  })

  return { redirectUrl, message: payload, expiresAt: expiresAt.toISOString() }
}

// Exported for testability only -- not part of the route-facing API surface
// (createInstallIntent is). The digest rules below have no other unit-test
// seam short of mocking the entire createInstallIntent pipeline (agent-
// installation ownership, shared-key decryption, signing), none of which the
// digest touches.
export async function resolveInstallArtifact(input: {
  slug: string
  source: InstallSource
  type: InstallArtifactType
  userId: string
  organizationId?: string
}): Promise<ResolvedInstallArtifact> {
  // Dispatched, not chained. The two catalogs used to be tried in order --
  // public, then private -- which made a private artifact whose name matched
  // a public one unreachable: the user pressed Install on their own item and
  // silently received someone else's. Neither branch falls through to the
  // other, so a miss is reported against the catalog the caller named rather
  // than being answered from the one it did not.
  return input.source === "private"
    ? resolvePrivateInstall(input)
    : resolvePublicInstall(input.slug)
}

async function resolvePublicInstall(
  slug: string
): Promise<ResolvedInstallArtifact> {
  const item = await getMarketplaceCatalogItem(slug)
  if (!item) {
    throw new Response(`No public marketplace entry is named "${slug}".`, {
      status: 404,
    })
  }

  const manifest = await buildUnifiedManifest()
  const manifestTool = manifest.tools.find((t) => t.name === item.slug)
  const manifestSkill = manifest.skills.find((s) => s.name === item.slug)
  // Digested from the manifest entry itself, so the inputs are exactly the
  // artifacts the entry publishes -- schemas and prompts included, which the
  // previous formula ignored entirely (design.md D4 / C13). `capabilities`
  // is typed optional on HubToolEntry but is required in practice: an entry
  // without it fails the agent's parse of the whole manifest (C7), so
  // toolEntryArtifactDigest throws rather than digesting around it.
  const digest = manifestTool
    ? toolEntryArtifactDigest(manifestTool)
    : manifestSkill
      ? skillEntryArtifactDigest(manifestSkill)
      : null
  if (!digest) {
    throw new Error("Marketplace Entry is not in the installable manifest.")
  }

  return { slug: item.slug, version: item.version, digest }
}

async function resolvePrivateInstall(input: {
  slug: string
  type: InstallArtifactType
  userId: string
  organizationId?: string
}): Promise<ResolvedInstallArtifact> {
  // The active organization is the whole address of a private artifact --
  // there is no organization-less private space to search -- so a session
  // without one is a question the hub cannot answer rather than a lookup that
  // finds nothing. Said in terms of the org switcher, which is the control
  // the user has to fix it.
  if (!input.organizationId) {
    throw new Response(
      "No private space is selected. Pick the organization that owns this item and try again.",
      { status: 400 }
    )
  }

  const { organizationId, slug, userId } = input

  // Keyed on `(organizationId, name)` and not on the type: that pair is what
  // `createPrivateArtifact` keeps collision-free by suffixing a duplicate
  // name to `-2`, so it already addresses one row. Filtering on type as well
  // would turn a wrong-type request into "no such artifact", which is the
  // less useful of the two errors -- the type is asserted below instead.
  // The membership clause is the authorization: a caller with no membership
  // matches nothing and is answered exactly as a caller whose organization
  // holds no such name, so the miss never confirms the artifact exists.
  const artifact = await prisma.privateArtifact.findFirst({
    where: {
      name: slug,
      organizationId,
      organization: { members: { some: { userId } } },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, version: true, type: true },
  })
  if (!artifact) {
    throw new Response(
      `No artifact named "${slug}" exists in ${await describeSearchedOrganization(userId, organizationId)}.`,
      { status: 404 }
    )
  }

  if (artifact.type !== input.type) {
    throw new Response(
      `"${slug}" is a ${artifact.type} in this workspace, not a ${input.type}.`,
      { status: 409 }
    )
  }

  // Validated, not merely present: this URL and every artifact URL derived
  // from it are re-checked by the agent against its configured catalog origin
  // (C1/C2), and a value that fails there produces an error naming the agent's
  // configuration instead of ours. Fail here, where the setting is named.
  const baseUrl = requireCatalogOriginBaseUrl()

  // The token is minted before the digest, not after, and that order is
  // forced twice over. The manifest URL embeds the token and is covered by
  // the install-delivery HMAC, so it cannot be issued later; and the entry
  // whose artifacts are digested carries that same token in every URL, so it
  // cannot be built earlier.
  //
  // Which kind of token is decided from the artifact row, not from the type
  // the caller asked for: a loadout needs one credential that authorizes every
  // member (design.md -- "Token claims move from an artifact to a loadout,
  // with membership authorization"), and a single-artifact token minted for
  // one would fetch the manifest and then 403 on the first member. Nothing
  // reaches this line as a loadout yet -- `InstallArtifactType` has no
  // `loadout` and the type assertion above refuses the mismatch -- so this is
  // the prerequisite sitting ahead of install delivery rather than delivery
  // itself, which is blocked on IronClaw asks 4 and 5.
  const token = mintInstallTokenForArtifact(artifact, {
    organizationId,
    ttlSeconds: ARTIFACT_TOKEN_TTL_SECONDS,
  })

  // The digest is taken over the entry this artifact will actually publish,
  // reusing the manifest builder rather than re-deriving an asset set beside
  // it. The agent recomputes it from the entry it parses out of the manifest
  // (C13), so any second derivation here would be a second chance to disagree
  // -- and disagreeing is precisely design.md's D4. The cost is one extra
  // lookup by id after the lookup by name above; the guarantee is that no
  // asset can reach the digest without being published, or vice versa.
  const entry = await buildPrivateArtifactEntry({
    organizationId,
    artifactId: artifact.id,
    token,
    baseUrl,
  })

  // Verified against the entry that was just built, not against a second read
  // of the artifact: the caps and byte ceilings the agent enforces apply to
  // what it is handed, and this is what it will be handed. Failing here costs
  // the user a message naming the limit; not failing here costs them an agent
  // -side error naming a constant they have never heard of, after the install
  // has already been signed and delivered.
  assertPublishedEntryInstallable(entry)

  // A soul is digested with `soulArtifactDigest` even though it publishes a
  // skill entry and the two formulas are the same value today. They are the
  // same because a soul publishes no `files[]`, not because a soul is a
  // skill; naming the soul formula here is what makes the day they diverge a
  // change in ironclaw-contract.ts rather than a hunt through call sites.
  const digest =
    entry.type === "tool"
      ? toolEntryArtifactDigest(entry.tool)
      : entry.type === "soul"
        ? soulArtifactDigest(entry.skill.skill_md.sha256)
        : skillEntryArtifactDigest(entry.skill)

  const url = `${baseUrl}/api/private-artifacts/manifest/${encodeURIComponent(token)}`

  return {
    slug: artifact.name,
    version: artifact.version,
    digest,
    privateManifest: { url, token },
  }
}

/**
 * Names the workspace a private miss was searched in, because the likeliest
 * cause of one is an org switcher left on another workspace and an error that
 * names what it searched turns that into a self-service fix.
 *
 * Re-read under the membership clause rather than joined onto the lookup
 * above: that lookup found nothing, and it found nothing either because the
 * name is absent or because the caller is not a member. Only a member is told
 * the workspace's name -- naming it to a stranger would confirm which
 * organization an id belongs to.
 */
async function describeSearchedOrganization(
  userId: string,
  organizationId: string
): Promise<string> {
  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, members: { some: { userId } } },
    select: { name: true },
  })

  return organization ? `"${organization.name}"` : "your active organization"
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
  const body = JSON.stringify({
    uid: input.userId,
    aid: input.id,
    ts,
    nonce,
    sig,
  })

  if (!(await postAgentRegistration(input.agentUrl, body))) {
    throw new Error("Agent registration failed.")
  }
}

async function postAgentRegistration(
  agentUrl: string,
  body: string
): Promise<boolean> {
  const target = new URL("/api/ironhub/register", agentUrl)
  const vetted = await resolvePublicAddresses(target.hostname)

  // `validateAgentUrl` is the gate on the scheme; by the time a stored agent
  // URL reaches here it is https, or it is http to a local agent under
  // `IRONHUB_ALLOW_LOCAL_ORIGINS`. Dispatch on what the URL actually says
  // rather than assuming, so the two cannot drift apart.
  const insecure = target.protocol === "http:"
  const transport = insecure ? http : https

  return new Promise<boolean>((resolve, reject) => {
    const request = transport.request(
      {
        hostname: target.hostname,
        servername: target.hostname,
        port: target.port || (insecure ? 80 : 443),
        path: `${target.pathname}${target.search}`,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        },
        timeout: 8000,
        lookup: (_hostname, options, callback) =>
          options.all
            ? callback(null, vetted)
            : callback(null, vetted[0].address, vetted[0].family),
      },
      (response) => {
        response.resume()
        const status = response.statusCode ?? 0
        resolve(status >= 200 && status < 300)
      }
    )

    request.on("timeout", () => {
      request.destroy(new Error("Agent registration timed out."))
    })
    request.on("error", reject)
    request.end(body)
  })
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
    artifact_digest: input.artifactDigest,
  })

  if (input.privateManifestUrl && input.manifestToken) {
    params.set("private_manifest_url", input.privateManifestUrl)
    params.set("manifest_token", input.manifestToken)
  }

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
    artifact_digest: input.artifactDigest,
  })

  if (input.privateManifestUrl) {
    params.set(
      "private_manifest_url",
      input.privateManifestUrl.replace(/[^/]*$/, "redacted")
    )
    params.set("manifest_token", "redacted")
  }

  return `${agentUrl}/#/install/${input.slug}?${params.toString()}`
}
