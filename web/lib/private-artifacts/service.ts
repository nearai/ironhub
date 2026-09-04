import { randomUUID } from "node:crypto"

import { CATEGORIES } from "../catalog/inference"
import { prisma } from "../db"
import { Prisma } from "../prisma/client"
import { ARTIFACT_TYPES } from "./artifact-types"
import {
  assertLoadoutPublishable,
  loadoutDocumentAssembler,
  pinLoadoutMembers,
} from "./loadout-composition"
import {
  PUBLISH_FREEZE_SELECT,
  assertArtifactContentUnfrozen,
} from "./publish-freeze"
import { verifyPrivateArtifact } from "./verification"

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
  "version",
] as const

type UpdatePrivateArtifactInput = {
  title?: string
  description?: string | null
  visibility?: string
  sourceUrl?: string | null
  category?: string | null
  version?: string
}

// Never select storageKey here — it's an internal S3 object pointer, not
// something the client needs or should see.
const CONTENT_SUMMARY_SELECT = {
  kind: true,
  sizeBytes: true,
  sha256: true,
  createdAt: true,
} as const

// Same rule as above: `path` is the asset's identity to a reader, storageKey
// is not theirs to see.
const ASSET_SUMMARY_SELECT = {
  kind: true,
  path: true,
  sizeBytes: true,
  sha256: true,
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
    include: {
      content: { select: CONTENT_SUMMARY_SELECT },
      // Included on the single-artifact read only: the owner's item page
      // lists what the hub actually stored and will serve, and the declared
      // schema/prompt files are half of that. The catalog listing has no use
      // for them and should not pay for the join.
      assets: { select: ASSET_SUMMARY_SELECT, orderBy: { path: "asc" } },
    },
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

  // The name is derived from a title the author typed, never typed itself
  // (both the skill and the tool form do this), so two unrelated items are
  // one shared title away from claiming the same name. Rather than rejecting
  // the second one with a 409 the author can do nothing about — the field
  // that collided isn't even on screen — the name is suffixed to the first
  // free `-2`, `-3`, ... The caller is told which name it actually got by
  // the returned row.
  let candidate = await findAvailableArtifactName(organizationId, input.name)

  // Two authors submitting the same title at once both see the same free
  // name above, so the unique index — not the lookup — is what decides.
  // Re-resolving on P2002 lets the loser take the next name instead of
  // failing; the bound stops a permanently colliding name from spinning.
  for (let attempt = 0; attempt < NAME_COLLISION_RETRIES; attempt += 1) {
    try {
      return await prisma.privateArtifact.create({
        data: {
          id: randomUUID(),
          organizationId,
          createdById: userId,
          type,
          name: candidate,
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
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
      ) {
        throw error
      }
      candidate = await findAvailableArtifactName(organizationId, input.name)
    }
  }

  throw new Response(
    "An artifact with this name and version already exists in this organization.",
    { status: 409 }
  )
}

/** How many times a create retries after losing a name race (see above). */
const NAME_COLLISION_RETRIES = 5

/**
 * `base` if no artifact in the organization holds it, else `base-2`,
 * `base-3`, ... — the first suffix nothing holds.
 *
 * Uniqueness is checked against the name alone, not the `(name, version)`
 * pair the index enforces: a name is the identity an installed skill or tool
 * carries into the agent (`manifest.ts` publishes it as the entry's `name`
 * and a skill's `trunk`), so two different items sharing one name across two
 * versions would read as two versions of a single item.
 */
async function findAvailableArtifactName(
  organizationId: string,
  base: string
) {
  // `startsWith` is the index-usable half of the filter; it also matches
  // names that merely begin with `base` ("my-tool" -> "my-toolkit"), so the
  // exact `base` / `base-<n>` shape is what actually decides below.
  const taken = new Set(
    (
      await prisma.privateArtifact.findMany({
        where: { organizationId, name: { startsWith: base } },
        select: { name: true },
      })
    ).map((artifact) => artifact.name)
  )

  if (!taken.has(base)) return base

  let suffix = 2
  while (taken.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
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
    if (input.description)
      assertMaxLength(input.description, "description", 4000)
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
    const visibility = assertEnum(input.visibility, VISIBILITIES, "visibility")
    data.visibility = visibility
  }
  if (input.version !== undefined) {
    assertValidArtifactVersion(input.version)
    assertVersionMovesForward(artifact.version, input.version)
    data.version = input.version
  }

  // publishPrivateArtifact/unpublishPrivateArtifact both include content in
  // their response; align PATCH so a client caching artifact responses by
  // shape doesn't silently lose `content` depending on which endpoint it
  // last hit.
  return prisma.privateArtifact.update({
    where: { id: artifact.id },
    data,
    include: { content: { select: CONTENT_SUMMARY_SELECT } },
  })
}

export async function deletePrivateArtifact(
  organizationId: string,
  id: string
) {
  const artifact = await getPrivateArtifact(organizationId, id)
  await prisma.privateArtifact.delete({ where: { id: artifact.id } })
  return artifact
}

/**
 * Publishing requires the same content completeness the install-link token
 * enforces via assertArtifactContentComplete, plus a category so the
 * artifact can be browsed/filtered once public. Both preconditions fail
 * with 409 naming what's missing; `status` never advances past `draft`
 * until they hold. Completeness is computed from the content list
 * getPrivateArtifact already loaded rather than re-querying it (that
 * second query is what assertArtifactContentComplete does for callers,
 * like the token route, that don't already have the artifact in hand).
 */
export async function publishPrivateArtifact(
  organizationId: string,
  id: string
) {
  const artifact = await getPrivateArtifact(organizationId, id)

  // A loadout stores no content of its own -- its members are what it
  // publishes -- so content completeness is not the question to ask of it.
  // Its gate is composition: at least one member, every member healthy, and
  // the assembled document inside the agent's ceiling. The resolution the
  // gate produced is held rather than discarded, because the pins written
  // below have to be the same resolution the gate approved and not a second
  // one taken a moment later.
  //
  // The assembler is passed explicitly rather than defaulted inside the gate,
  // so a caller that measures nothing is a visible omission rather than a
  // quiet one: with no assembler the gate refuses, which is the right way for
  // an unmeasured document to fail.
  let resolvedMembers:
    | Awaited<ReturnType<typeof assertLoadoutPublishable>>
    | null = null
  if (artifact.type === "loadout") {
    resolvedMembers = await assertLoadoutPublishable(organizationId, artifact, {
      assembleDocument: loadoutDocumentAssembler,
    })
  } else {
    const required = requiredContentKindsFor(artifact.type)
    if (!required) {
      throw new Response(`Unsupported artifact type: ${artifact.type}`, {
        status: 409,
      })
    }
    const presentKinds = new Set(artifact.content.map((c) => c.kind))
    const missing = required.filter((kind) => !presentKinds.has(kind))
    if (missing.length > 0) {
      throw new Response(
        `Artifact is missing required content: ${missing.join(", ")}`,
        { status: 409 }
      )
    }
  }
  if (!artifact.category) {
    throw new Response("Artifact cannot be published: category is not set", {
      status: 409,
    })
  }

  // Pinned after every refusal has been raised and before the status moves,
  // so a loadout is never published carrying the pins of a resolution that
  // was rejected, and never left pinned to a publication that did not happen.
  if (resolvedMembers) {
    await pinLoadoutMembers(resolvedMembers)
  }

  // `publishedVersion` is stamped here and nowhere else: it is the record of
  // which version an agent may from now on have installed, and the content
  // freeze reads it to decide whether the stored files are still the ones that
  // version named. Re-publishing after a bump restamps it, which re-freezes
  // the new version's files.
  return prisma.privateArtifact.update({
    where: { id: artifact.id },
    data: { status: "published", publishedVersion: artifact.version },
    include: { content: { select: CONTENT_SUMMARY_SELECT } },
  })
}

export async function unpublishPrivateArtifact(
  organizationId: string,
  id: string
) {
  const artifact = await getPrivateArtifact(organizationId, id)

  // Cleared alongside the status so the two never disagree about whether this
  // artifact is published. A draft is freely editable, so the recorded version
  // has nothing left to guard.
  return prisma.privateArtifact.update({
    where: { id: artifact.id },
    data: { status: "draft", publishedVersion: null },
    include: { content: { select: CONTENT_SUMMARY_SELECT } },
  })
}

// design.md D3: manifest.toml (schema reborn.extension_manifest.v3) is now
// the authoritative metadata carrier for a tool -- it owns effects,
// default_permission, and the secrets handle list that *.capabilities.json
// used to carry. `capabilities` therefore moved from required to optional;
// `manifest_toml` took its place. This is a deliberate breaking change to
// completeness, made on the owner's call: a tool created before bundle
// ingest existed has a `capabilities` row but no `manifest_toml` row, so it
// now reads as incomplete and is unpublishable until re-uploaded as a zip.
// No migration/backfill/grandfathering here on purpose -- surface it
// honestly through content_complete below instead.
const REQUIRED_CONTENT_KINDS_BY_TYPE: Record<string, readonly string[]> = {
  tool: ["wasm", "manifest_toml"],
  skill: ["skill_md"],
  // `readme_md` is deliberately absent: a soul is one required document plus
  // an optional readme, and the readme is never published anyway (design.md
  // -- "`readme_md` is a content kind, not an asset, and never published").
  soul: ["soul_md"],
}

function requiredContentKindsFor(type: string): readonly string[] | undefined {
  return REQUIRED_CONTENT_KINDS_BY_TYPE[type]
}

/**
 * Verifies the artifact has every content kind required by its type before
 * an install-link token is minted, so a token is never handed out for a
 * manifest fetch that is guaranteed to fail. Callers that already hold the
 * artifact's content list (e.g. publishPrivateArtifact) should check
 * requiredContentKindsFor() against it directly instead of calling this —
 * it always re-fetches.
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

  // A loadout is refused here, and the refusal is deliberate rather than a
  // gap: install delivery waits on the agent's multi-entry payload (blocked on
  // IronClaw asks 4 and 5), and a partial loadout is never served. What it
  // must not do is fall through to "unsupported artifact type" -- the hub
  // knows exactly what a loadout is, and a message saying otherwise reads as a
  // defect in the hub rather than as the state we are actually in. Worded to
  // match what the loadout editor already tells the owner, so the API and the
  // screen do not contradict each other.
  if (artifact.type === "loadout") {
    throw new Response(
      "Installing a loadout is not available yet: an install payload carries one artifact and a loadout is many, and a partial loadout is never served. This will work once the agent supports a multi-entry install payload.",
      { status: 409 }
    )
  }

  const required = requiredContentKindsFor(artifact.type)
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
      // Selected for the agent-contract row: a loadout's answer depends on
      // whether each member is at least as visible as the loadout is.
      visibility: true,
      category: true,
      sourceUrl: true,
      content: { select: { kind: true } },
    },
  })
  if (!artifact) {
    throw new Response("Artifact not found", { status: 404 })
  }

  const presentKinds = new Set(artifact.content.map((c) => c.kind))
  const required = requiredContentKindsFor(artifact.type) ?? []
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
    // No standalone manifest_present check (design.md D8, revised): once
    // manifest_toml became a required kind, content_complete above already
    // fails and names it -- a second row calling the same fact a `warn`
    // read as contradictory (one row implying the absence is tolerable,
    // the other being the hard publish gate). One fact, one row.
    // No capabilities check either. `*.capabilities.json` is the legacy
    // carrier of data reborn.extension_manifest.v3 moved into manifest.toml,
    // the agent stores whatever we publish under `legacy/capabilities.json`
    // and never reads it (ironclaw-contract.ts), and nothing in the workspace
    // offers to add or edit one any more. A row about a file the owner cannot
    // see, cannot act on, and that no installer opens is noise on the one
    // panel that is supposed to say why publishing is blocked. The bound that
    // still matters -- its size -- is enforced by the agent_contract check
    // below (verification.ts `capabilities_size`).
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

  if (artifact.type === "soul") {
    // Only the soul document gets a row. A stored README is not a publish
    // precondition and never reaches an agent, so a row about it would be a
    // row the owner cannot fail -- noise on the one panel that exists to say
    // why publishing is blocked.
    checks.push(
      presentKinds.has("soul_md")
        ? {
            id: "soul_md_present",
            label: "SOUL.md uploaded",
            status: "pass",
            detail: "soul_md content is stored for this soul.",
          }
        : {
            id: "soul_md_present",
            label: "SOUL.md uploaded",
            status: "fail",
            detail: "soul_md content is missing.",
          }
    )
  }

  checks.push(
    await checkAgentContract(organizationId, artifact, missing.length === 0)
  )

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

  // Omitted entirely for a loadout rather than passed. Every other type is
  // built from code that lives somewhere, so a link to it tells a reader where
  // the thing came from. A loadout is composed inside the hub out of members
  // that each already carry their own link, so a link on the loadout would
  // either duplicate one member's or point at nothing (design.md -- "A loadout
  // has no source repository"). Reporting it as a pass would be the worse of
  // the two, since it would claim a link this artifact does not have and
  // cannot meaningfully have.
  if (artifact.type !== "loadout") {
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
  }

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

/**
 * Publish-time verification, as one row.
 *
 * One row rather than one per failure because the ids would collide -- an
 * artifact can have several oversized assets -- and because from the owner's
 * side this is a single question ("would an agent accept this?") with a list
 * of reasons attached, not several independent facts.
 *
 * Skipped as a `warn` when required content is already missing: the
 * verification pass would then fail for exactly the reason content_complete
 * has already reported, and two rows restating one fact is what the comment
 * above this block exists to prevent.
 */
async function checkAgentContract(
  organizationId: string,
  artifact: { id: string; type: string; visibility: string },
  contentComplete: boolean
): Promise<ArtifactCheck> {
  const label = "Installable by an agent"
  const artifactId = artifact.id

  // A loadout is not one entry, so there is no entry to verify and asking for
  // one produces "Unsupported artifact type: loadout" -- which says the hub
  // does not know what a loadout is, on the same screen where the install
  // panel correctly explains that it does and is waiting on the agent. The
  // question this row asks ("would an agent accept this?") is answerable for a
  // composite; it is just answered over the assembled document and the members
  // rather than over a single entry.
  //
  // Answered by the publish gate itself, not by a second implementation of it:
  // the row and the refusal an owner gets on publish are then the same verdict
  // in the same words, which is the property whose absence caused this bug.
  if (artifact.type === "loadout") {
    return await checkLoadoutAgentContract(organizationId, artifact, label)
  }

  if (!contentComplete) {
    return {
      id: "agent_contract",
      label,
      status: "warn",
      detail:
        "Not checked yet: required content is missing, so there is no entry to verify.",
    }
  }

  let result: Awaited<ReturnType<typeof verifyPrivateArtifact>>
  try {
    result = await verifyPrivateArtifact({ organizationId, artifactId })
  } catch (error) {
    // Storage unreachable, an unparseable stored document, anything that is
    // not a verdict about the artifact. Reporting it as `fail` would tell the
    // owner their artifact is broken when the infrastructure is.
    console.error(
      `Failed to verify publishable entry for artifact ${artifactId}:`,
      error
    )
    return {
      id: "agent_contract",
      label,
      status: "warn",
      detail:
        "The publishable entry could not be built, so it was not checked.",
    }
  }

  return {
    id: "agent_contract",
    label,
    status: result.ok ? "pass" : "fail",
    detail: result.ok
      ? "The entry this artifact publishes satisfies the agent's asset, size, and manifest limits."
      : result.failures.map((failure) => failure.message).join(" "),
  }
}

/**
 * The agent-contract row for a composite.
 *
 * Keeps the row's three states and its "one row, several reasons" shape -- the
 * reasons a loadout is unpublishable are a list for the same reason a tool's
 * are (an owner should fix them in one pass), and they are already delivered
 * as one joined sentence by the gate.
 *
 * `fail` is reserved for verdicts about the loadout, and `warn` for everything
 * that is not one, matching the tool path directly above. The gate reports a
 * verdict as a 409; anything else -- storage, an unreadable stored document --
 * is infrastructure, and telling an owner their loadout is broken when the
 * infrastructure is would be the same mistake in a new place.
 */
async function checkLoadoutAgentContract(
  organizationId: string,
  loadout: { id: string; visibility: string },
  label: string
): Promise<ArtifactCheck> {
  try {
    await assertLoadoutPublishable(organizationId, loadout, {
      assembleDocument: loadoutDocumentAssembler,
    })
  } catch (error) {
    if (error instanceof Response && error.status === 409) {
      return {
        id: "agent_contract",
        label,
        status: "fail",
        detail: asDetailSentence(await error.text()),
      }
    }

    console.error(
      `Failed to verify publishable loadout ${loadout.id}:`,
      error
    )
    return {
      id: "agent_contract",
      label,
      status: "warn",
      detail: "The loadout's members could not be checked, so it was not verified.",
    }
  }

  return {
    id: "agent_contract",
    label,
    status: "pass",
    detail:
      "Every member resolves, and the document this loadout publishes satisfies the agent's size and manifest limits.",
  }
}

/**
 * The gate's refusal, as a sentence for a checks row.
 *
 * The gate prefixes its reasons with what it was refusing to do, which reads
 * correctly on a publish attempt and redundantly under a row already labelled
 * "Installable by an agent". The reasons themselves are what the owner acts
 * on, so they are what is kept.
 */
function asDetailSentence(message: string): string {
  const reasons = message.replace(/^Loadout cannot be published:\s*/, "")
  const sentence = reasons.charAt(0).toUpperCase() + reasons.slice(1)
  return sentence.endsWith(".") ? sentence : `${sentence}.`
}

export async function deletePrivateArtifactContentRow(
  organizationId: string,
  artifactId: string,
  kind: string
) {
  // Removing a content row changes what a published version resolves to just
  // as much as overwriting it does, so it answers to the same freeze the
  // upload paths do (content.ts, assets.ts).
  const artifact = await prisma.privateArtifact.findFirst({
    where: { id: artifactId, organizationId },
    select: PUBLISH_FREEZE_SELECT,
  })
  if (!artifact) {
    throw new Response("Artifact not found", { status: 404 })
  }
  assertArtifactContentUnfrozen(artifact)

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

/**
 * A new version must differ from the current one, and where both values are
 * semantic versions it must be greater.
 *
 * Ordering is enforced only where both sides parse because the grammar above
 * is far wider than semver: date stamps, build numbers and bare words are all
 * legal and already stored, and a rule that demanded semver would leave those
 * artifacts unbumpable forever. Inequality alone is the weaker guarantee those
 * values get. It still holds the line the content freeze depends on — bytes
 * cannot change under a version string that stayed put — it just cannot tell
 * an accidental downgrade from a deliberate one.
 */
function assertVersionMovesForward(current: string, next: string) {
  if (current === next) {
    throw new Response(
      `version is already ${current}; a new version must differ from the current one`,
      { status: 400 }
    )
  }

  const currentSemver = parseSemver(current)
  const nextSemver = parseSemver(next)
  if (!currentSemver || !nextSemver) return

  // `<= 0` and not `< 0`: two strings can differ while ranking equal, because
  // build metadata carries no precedence (`1.0.0+a` -> `1.0.0+b` moves the
  // string and nothing else). That is a downgrade's twin, not a bump.
  if (compareSemver(nextSemver, currentSemver) <= 0) {
    throw new Response(
      `version ${next} is not greater than the current version ${current}`,
      { status: 400 }
    )
  }
}

type Semver = {
  core: readonly [number, number, number]
  /** Dot-separated identifiers, or null when the version carries none. */
  prerelease: readonly string[] | null
}

// Semver 2.0.0's own recommended pattern, minus the named groups. Build
// metadata is matched so that a version carrying one still parses, then
// dropped: the specification excludes it from precedence, so keeping it would
// only invite a comparison that pretends it means something.
const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/

function parseSemver(value: string): Semver | null {
  const match = SEMVER_PATTERN.exec(value)
  if (!match) return null

  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4] === undefined ? null : match[4].split("."),
  }
}

/** Negative, zero or positive as `a` ranks below, with, or above `b`. */
function compareSemver(a: Semver, b: Semver): number {
  for (let index = 0; index < 3; index += 1) {
    if (a.core[index] !== b.core[index]) {
      return a.core[index] < b.core[index] ? -1 : 1
    }
  }

  // A prerelease ranks below the release that shares its core, so `1.1.0-rc.1`
  // is not a bump over `1.1.0` even though it is a bump over `1.0.0`.
  if (a.prerelease === null || b.prerelease === null) {
    if (a.prerelease === b.prerelease) return 0
    return a.prerelease === null ? 1 : -1
  }

  return comparePrereleaseIdentifiers(a.prerelease, b.prerelease)
}

function comparePrereleaseIdentifiers(
  a: readonly string[],
  b: readonly string[]
): number {
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    const left = a[index]
    const right = b[index]
    const leftIsNumeric = /^\d+$/.test(left)
    const rightIsNumeric = /^\d+$/.test(right)

    if (leftIsNumeric && rightIsNumeric) {
      // Compared as numbers, so `rc.9` -> `rc.10` reads as a bump where an
      // ASCII comparison would call it a downgrade.
      if (left !== right) return Number(left) < Number(right) ? -1 : 1
      continue
    }
    if (leftIsNumeric !== rightIsNumeric) return leftIsNumeric ? -1 : 1
    if (left !== right) return left < right ? -1 : 1
  }

  // Every identifier they share is equal, so the longer one wins: `alpha` <
  // `alpha.1`.
  if (a.length === b.length) return 0
  return a.length < b.length ? -1 : 1
}

function assertMaxLength(value: string, field: string, max: number) {
  if (value.length > max) {
    throw new Response(`${field} must be at most ${max} characters`, {
      status: 400,
    })
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
  // is shown as link text. Reject a non-default port too — `hostname` drops
  // it, so `https://github.com:8443/o/r` would otherwise pass the host check
  // while pointing somewhere github.com does not control.
  const host = parsed.hostname.replace(/^www\./, "")
  if (
    parsed.protocol !== "https:" ||
    parsed.port !== "" ||
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
