// Building the catalog entry a private artifact publishes to an agent.
//
// The entry is built once, here, and everything downstream is derived from it
// rather than reassembled beside it. That is not tidiness: the agent recomputes
// the artifact digest from the entry it parsed and compares it to the digest
// signed into the install delivery, and it separately requires the published
// asset set to equal the set the extension manifest declares (C9), in both
// directions. Two independent derivations of "what this tool publishes" agree
// only until one of them is edited, and D1/D4 are what that looks like when it
// happens. `resolvePrivateInstall` therefore calls `buildPrivateArtifactEntry`
// and digests its result -- it does not query for assets itself.
import { hubToolEntry } from "@/lib/catalog/hub-entry"
import {
  CAPABILITIES_STUB_SHA256,
  CAPABILITIES_STUB_SIZE_BYTES,
} from "@/lib/catalog/ironclaw-contract"
import type {
  HubArtifact,
  HubManifest,
  HubSkillEntry,
  HubToolEntry,
  Provenance,
} from "@/lib/catalog/manifest-types"

import { prisma } from "../db"
import { getObjectBytes } from "../storage"
import { type AssetKind, listArtifactAssets } from "./assets"
import { declaredAssetPaths } from "./bundle"
import type { ContentKind } from "./content"
import { isMissingObjectError } from "./relay"

const PRIVATE_PROVENANCE: Provenance = "private"

function contentUrl(
  baseUrl: string,
  artifactId: string,
  kind: ContentKind,
  token: string
): string {
  return `${baseUrl}/api/private-artifacts/${artifactId}/content/${kind}/${encodeURIComponent(token)}`
}

/**
 * The declared path is appended verbatim, with no encoding pass. That is a
 * requirement, not a shortcut: the agent validates the published path with
 * `ExtensionAssetPath` and then matches it against the path its own manifest
 * declares, so any transformation between the two breaks the C9 set equality
 * even though every byte still downloads. It is safe because the grammar
 * (`isExtensionAssetPath`, checked before any asset is stored) admits only
 * unreserved URL path characters, so an accepted path is already its own
 * encoding.
 */
function assetUrl(
  baseUrl: string,
  artifactId: string,
  kind: AssetKind,
  path: string,
  token: string
): string {
  return `${baseUrl}/api/private-artifacts/${artifactId}/asset/${kind}/${encodeURIComponent(token)}/${path}`
}

export type PrivateArtifactEntry =
  | { type: "tool"; artifactId: string; tool: HubToolEntry }
  | { type: "skill"; artifactId: string; skill: HubSkillEntry }

type EntryInput = {
  organizationId: string
  artifactId: string
  token: string
  baseUrl: string
}

export async function buildPrivateArtifactEntry(
  input: EntryInput
): Promise<PrivateArtifactEntry> {
  const artifact = await prisma.privateArtifact.findFirst({
    where: { id: input.artifactId, organizationId: input.organizationId },
    include: {
      content: {
        select: { kind: true, sha256: true, sizeBytes: true, storageKey: true },
      },
    },
  })
  if (!artifact) {
    throw new Response("Artifact not found", { status: 404 })
  }

  const byKind = new Map(artifact.content.map((c) => [c.kind, c]))
  const hubArtifact = (kind: ContentKind): HubArtifact => {
    const content = byKind.get(kind)
    if (!content) {
      throw new Response(`Artifact is missing required content: ${kind}`, {
        status: 409,
      })
    }
    return {
      url: contentUrl(input.baseUrl, artifact.id, kind, input.token),
      size_bytes: content.sizeBytes,
      sha256: content.sha256,
    }
  }

  if (artifact.type === "skill") {
    return {
      type: "skill",
      artifactId: artifact.id,
      skill: {
        name: artifact.name,
        trunk: artifact.name,
        version: artifact.version,
        description: artifact.description ?? "",
        provenance: PRIVATE_PROVENANCE,
        skill_md: hubArtifact("skill_md"),
      },
    }
  }

  if (artifact.type !== "tool") {
    throw new Response(`Unsupported artifact type: ${artifact.type}`, {
      status: 409,
    })
  }

  // manifest.toml is optional at parse on the agent side but mandatory at
  // install (C8), and it is the document the declared asset set is read from,
  // so a tool without one publishes no assets at all. Left as an omission
  // rather than a rejection here: refusing to publish such a tool is
  // publish-time verification's call, and it needs to say so on the artifact
  // screen rather than at the moment an agent asks for the manifest.
  const manifestContent = byKind.get("manifest_toml")
  const declared = manifestContent
    ? await readDeclaredAssets(manifestContent.storageKey)
    : { schemas: [], prompts: [] }

  const stored = await listArtifactAssets(
    input.organizationId,
    input.artifactId
  )
  const storedByIdentity = new Map(
    stored.map((asset) => [`${asset.kind} ${asset.path}`, asset])
  )

  // Iterating the *declared* paths, not the stored ones, is what makes the
  // two sets equal rather than merely overlapping. A declared asset with no
  // stored counterpart fails below, and a stored asset nothing declares is
  // never reached, so it is omitted -- which the agent requires just as
  // strictly (`ironhub/package.rs` errors on an extra published artifact,
  // not only on a missing one).
  const publish = (kind: AssetKind, paths: string[]) =>
    Object.fromEntries(
      paths.map((path) => {
        const asset = storedByIdentity.get(`${kind} ${path}`)
        if (!asset) {
          throw new Response(
            `manifest.toml declares ${kind} asset "${path}", which is not stored for this artifact`,
            { status: 409 }
          )
        }
        return [
          path,
          {
            url: assetUrl(input.baseUrl, artifact.id, kind, path, input.token),
            size_bytes: asset.sizeBytes,
            sha256: asset.sha256,
          } satisfies HubArtifact,
        ]
      })
    )

  return {
    type: "tool",
    artifactId: artifact.id,
    tool: hubToolEntry({
      name: artifact.name,
      version: artifact.version,
      description: artifact.description,
      provenance: PRIVATE_PROVENANCE,
      wasm: hubArtifact("wasm"),
      capabilities: byKind.has("capabilities")
        ? hubArtifact("capabilities")
        : capabilitiesStubArtifact(input.baseUrl, artifact.id, input.token),
      manifest: manifestContent ? hubArtifact("manifest_toml") : null,
      schemas: publish("schema", declared.schemas),
      prompts: publish("prompt", declared.prompts),
    }),
  }
}

/**
 * UPSTREAM WORKAROUND -- see CAPABILITIES_STUB_TEXT in ironclaw-contract.ts.
 *
 * `capabilities` cannot be omitted: it has no serde default on the agent side
 * (C7), so an entry without it fails the parse of the entire manifest, taking
 * every other entry down with it. A manifest v3 tool legitimately ships no
 * `*.capabilities.json`, so the two bytes the agent will store and never read
 * are published from a constant instead.
 *
 * The URL is the ordinary content route for the `capabilities` kind, which
 * serves the same constant when it finds no stored row -- so the advertised
 * size and digest describe bytes that route actually returns, and the URL sits
 * on the catalog origin as C2 requires. Nothing is written to storage.
 */
function capabilitiesStubArtifact(
  baseUrl: string,
  artifactId: string,
  token: string
): HubArtifact {
  return {
    url: contentUrl(baseUrl, artifactId, "capabilities", token),
    size_bytes: CAPABILITIES_STUB_SIZE_BYTES,
    sha256: CAPABILITIES_STUB_SHA256,
  }
}

/**
 * Reads the declared asset set back out of the stored manifest document.
 *
 * Re-derived at publish time rather than carried forward from ingest, because
 * ingest is not the only writer: `PUT .../content/manifest_toml` replaces the
 * document on its own, with no archive and no asset pass. Trusting the stored
 * asset rows to still describe it would publish a set that matches nothing,
 * and C9 is checked against the manifest.
 */
async function readDeclaredAssets(storageKey: string) {
  let bytes: Uint8Array
  try {
    bytes = await getObjectBytes(storageKey)
  } catch (error) {
    if (isMissingObjectError(error)) {
      throw new Response(
        "Artifact's manifest.toml is recorded but missing from storage",
        { status: 409 }
      )
    }
    throw error
  }

  try {
    return declaredAssetPaths(new TextDecoder().decode(bytes))
  } catch (error) {
    // declaredAssetPaths reports an unparseable document as a 400, which is
    // ingest's framing (the author uploaded a bad archive). Here the request
    // is fine and the stored artifact is not, so it is the artifact that is
    // in conflict.
    if (error instanceof Response && error.status === 400) {
      throw new Response(await error.text(), { status: 409 })
    }
    throw error
  }
}

/**
 * Wraps a single entry in the one-entry manifest document a private install
 * serves. Split out from `buildPrivateArtifactManifest` so publish-time
 * verification can measure the document an entry *would* produce (C11 caps the
 * decoded manifest at 1MB and its signed envelope at 2MB, and both now scale
 * with published asset count) without a second idea of what that document
 * looks like.
 */
export function privateArtifactManifestDocument(
  entry: PrivateArtifactEntry,
  generatedAt: string
): HubManifest {
  return {
    version: "1",
    generated_at: generatedAt,
    release_tag: `private-${entry.artifactId}`,
    repo: "ironhub-private",
    tools: entry.type === "tool" ? [entry.tool] : [],
    skills: entry.type === "skill" ? [entry.skill] : [],
  }
}

export async function buildPrivateArtifactManifest(input: {
  organizationId: string
  artifactId: string
  token: string
  baseUrl: string
  generatedAt: string
}): Promise<HubManifest> {
  const entry = await buildPrivateArtifactEntry(input)

  return privateArtifactManifestDocument(entry, input.generatedAt)
}
