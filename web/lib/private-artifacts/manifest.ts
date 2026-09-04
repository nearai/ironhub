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
//
// A loadout install is the same rule over several entries: `privateManifestDocument`
// takes the entries its members resolved to and `loadoutEntryArtifactDigest`
// digests that same array, so no member can reach the digest without being
// published or be published without reaching the digest.
import { hubToolEntry } from "@/lib/catalog/hub-entry"
import {
  CAPABILITIES_STUB_SHA256,
  CAPABILITIES_STUB_SIZE_BYTES,
  loadoutArtifactDigest,
  skillEntryArtifactDigest,
  soulArtifactDigest,
  toolEntryArtifactDigest,
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

/**
 * A soul carries `skill` rather than a `soul` field of its own: what it
 * publishes today *is* a skill entry, and typing it as anything else would be
 * a second name for the same document that every consumer then has to unify.
 * The discriminant is still `"soul"`, so publish-time verification and the
 * install digest can say something about a soul that they do not say about a
 * skill -- which is the whole reason it is not simply built as one.
 */
export type PrivateArtifactEntry = LoadoutManifestEntry & { artifactId: string }

/**
 * One published entry, without the private artifact it came from.
 *
 * A loadout's members are not all private artifacts: a public member is
 * resolved live from the IronHub release or the Iliad backend and has no row
 * here to carry an id (design.md -- "Public members resolve live; no bytes are
 * copied"). The document builder and the install digest both need to accept
 * such an entry, so what they take is this shape and `PrivateArtifactEntry` is
 * it plus the id the private path additionally has.
 *
 * The `soul` discriminant survives into both, which is the point of it: what a
 * soul publishes is a skill entry, and only this label lets the digest say
 * `soul:` where the document says `skills[]`.
 */
export type LoadoutManifestEntry =
  | { type: "tool"; tool: HubToolEntry }
  | { type: "skill"; skill: HubSkillEntry }
  | { type: "soul"; skill: HubSkillEntry }

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

  if (artifact.type === "soul") {
    return soulEntry(artifact.id, {
      name: artifact.name,
      version: artifact.version,
      description: artifact.description,
      soulDocument: hubArtifact("soul_md"),
    })
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
 * The one place a soul becomes something an agent can install.
 *
 * Today's agent has no soul entry type, so a soul is published as a skill
 * entry whose skill document is the SOUL.md: structurally a soul *is* a skill
 * with no bundled files, and that shape installs on an unmodified agent
 * (design.md -- "Publish a soul as a skill entry, behind an adapter"). Asks 1
 * and 2 to IronClaw would give souls an entry of their own; when they land,
 * this function and the `skills`/`souls` split in
 * `privateArtifactManifestDocument` are the whole edit, because nothing else
 * constructs the published shape.
 *
 * `files` is deliberately absent rather than `[]`: the agent switches digest
 * formula on whether the list is empty and the two framings are not
 * extensions of each other, so publishing an empty list where the no-files
 * branch is meant is a digest the agent never reproduces
 * (`skillEntryArtifactDigest` in ironclaw-contract.ts).
 *
 * The soul's `readme_md` is not passed in and has no field to go in. It is
 * hub-only (`HUB_ONLY_CONTENT_KINDS` in content.ts): publishing a document
 * the agent stores and never reads is the `capabilities.json` situation, and
 * it would also enter the digest, which is worse -- the readme is editable
 * without the soul changing at all.
 */
function soulEntry(
  artifactId: string,
  soul: {
    name: string
    version: string
    description: string | null
    soulDocument: HubArtifact
  }
): PrivateArtifactEntry {
  return {
    type: "soul",
    artifactId,
    skill: {
      name: soul.name,
      trunk: soul.name,
      version: soul.version,
      description: soul.description ?? "",
      provenance: PRIVATE_PROVENANCE,
      skill_md: soul.soulDocument,
    },
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
 * The manifest document an install serves, over however many entries it has.
 *
 * `HubManifest.tools[]` and `skills[]` were always arrays; until loadouts,
 * every caller put exactly one entry in exactly one of them. A loadout puts
 * one entry per member into the array matching that member's kind, and this is
 * the only function that decides which array that is -- so a soul's home moves
 * once, here and in `soulEntry`, the day the agent grows a `souls[]` (ask 2).
 *
 * `artifactId` is the artifact the document is *served for*: the leaf itself
 * on a single-artifact install, and the loadout on a loadout install. It
 * reaches only `release_tag`, which exists so an agent's logs name what it was
 * handed, and never enters any digest.
 *
 * Split out from `buildPrivateArtifactManifest` so publish-time verification
 * can measure the document a set of entries *would* produce (C11 caps the
 * decoded manifest at 1MB and its signed envelope at 2MB, and both scale with
 * published asset count -- for a loadout, summed over every member) without a
 * second idea of what that document looks like.
 */
export function privateManifestDocument(input: {
  artifactId: string
  entries: readonly LoadoutManifestEntry[]
  generatedAt: string
}): HubManifest {
  const tools: HubToolEntry[] = []
  // A soul rides in `skills[]` because that is where the agent looks for a
  // document to install; there is no `souls[]` to put it in yet.
  const skills: HubSkillEntry[] = []
  for (const entry of input.entries) {
    if (entry.type === "tool") {
      tools.push(entry.tool)
    } else {
      skills.push(entry.skill)
    }
  }

  return {
    version: "1",
    generated_at: input.generatedAt,
    release_tag: `private-${input.artifactId}`,
    repo: "ironhub-private",
    tools,
    skills,
  }
}

/**
 * The one-entry case, kept as its own name because the single-artifact install
 * path and publish-time verification both read better for it -- and because a
 * single artifact's document is served under that artifact's own id, which is
 * a fact about the caller rather than something to restate at each call site.
 */
export function privateArtifactManifestDocument(
  entry: PrivateArtifactEntry,
  generatedAt: string
): HubManifest {
  return privateManifestDocument({
    artifactId: entry.artifactId,
    entries: [entry],
    generatedAt,
  })
}

/**
 * The digest an install payload for a loadout carries, taken over the entries
 * that loadout is about to publish.
 *
 * This is the loadout counterpart of `toolEntryArtifactDigest`, and it exists
 * for the same reason (D4): the agent recomputes the loadout digest from the
 * members it parsed out of the manifest document, so the digest and the
 * document have to be taken over one set of entries rather than two
 * assembled beside each other. Call it with the same array that was passed to
 * `privateManifestDocument`; anything else is the second derivation the whole
 * shape of this module exists to prevent.
 *
 * A member's own digest is taken from its published entry by the same function
 * the single-artifact install path uses, so a member installed alone and the
 * same member installed inside a loadout digest identically. A soul is
 * digested with `soulArtifactDigest` even though it publishes a skill entry --
 * the two agree today only because a soul publishes no `files[]`, and naming
 * the soul formula here is what makes the day they diverge a change in
 * ironclaw-contract.ts rather than a hunt through call sites.
 *
 * Nothing here is stored. The value is minted with the payload, over the
 * members as they resolved at that moment, because a loadout's public members
 * are allowed to track upstream and a digest taken at publish would stop
 * matching what the agent recomputes from what it downloaded (design.md --
 * "The loadout digest is computed at install, not at publish").
 */
export function loadoutEntryArtifactDigest(
  entries: readonly LoadoutManifestEntry[]
): string {
  return loadoutArtifactDigest(
    entries.map((entry) => {
      if (entry.type === "tool") {
        return {
          kind: "tool" as const,
          name: entry.tool.name,
          digest: toolEntryArtifactDigest(entry.tool),
        }
      }
      if (entry.type === "soul") {
        return {
          kind: "soul" as const,
          name: entry.skill.name,
          digest: soulArtifactDigest(entry.skill.skill_md.sha256),
        }
      }
      return {
        kind: "skill" as const,
        name: entry.skill.name,
        digest: skillEntryArtifactDigest(entry.skill),
      }
    })
  )
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
