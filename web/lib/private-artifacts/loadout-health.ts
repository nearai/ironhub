// Loadout member health: is every member still there, and is it still the
// artifact that was pinned?
//
// verification.ts's sibling, and deliberately shaped like it: a pure-ish
// resolver that returns every finding rather than the first, plus assertion
// wrappers for the paths that must refuse. The difference is what "the
// artifact" means. verification.ts asks whether one stored artifact satisfies
// the agent's contract; this module asks whether a *reference* recorded at
// publish still points at the same bytes it pointed at then.
//
// The one decision everything here follows from is design.md -- "Pin by
// source: digest for private members, resolvability for public members":
//
//   * A private member cannot change its bytes without its owner moving its
//     version (the content freeze in add-artifact-versioning). A digest
//     mismatch is therefore an attributable event inside the organization
//     that owns both artifacts, and it BLOCKS installs until the loadout is
//     republished.
//   * A public member's release cadence belongs to somebody else. Its digest
//     is still recorded and still compared, but a mismatch is reported to the
//     owner as an upstream update and does NOT block installs -- blocking
//     would punish the loadout's owner for a change neither they nor the
//     installer can undo.
//
// The two cases are never collapsed. `status` distinguishes them by name
// (`drifted` vs `updated_upstream`) and `blocksInstall` distinguishes them by
// consequence.
//
// A second fact shapes resolution itself: no source retains older bytes. The
// official manifest is fetched from `releases/latest/download/tools.json`
// (lib/catalog/manifest.server.ts), the Iliad listing surfaces current
// versions only, and PrivateArtifactContent is one row per kind overwritten on
// upload with version history listed as a Non-Goal. Every member therefore
// resolves to whatever is *currently* published under its recorded identity,
// and the pinned digest exists to say whether that is still what was
// published -- it is a fingerprint, never an address.
import {
  CatalogOriginError,
  requireCatalogOriginBaseUrl,
} from "@/lib/catalog/catalog-origin"
import {
  skillEntryArtifactDigest,
  soulArtifactDigest,
  toolEntryArtifactDigest,
} from "@/lib/catalog/ironclaw-contract"
import type { HubSkillEntry, HubToolEntry } from "@/lib/catalog/manifest-types"
import type { IliadPublicSkill } from "@/lib/iliad/public-skills-types"
import { createIliadSkillSlug } from "@/lib/iliad/public-skills-utils"

import { prisma } from "../db"
import {
  buildPrivateArtifactEntry,
  type LoadoutManifestEntry,
  type PrivateArtifactEntry,
} from "./manifest"

export type MemberSource = "private" | "public"
export type MemberKind = "tool" | "skill" | "soul"
export type MemberStatusCode =
  | "ok"
  | "draft"
  | "visibility_too_narrow"
  | "missing"
  | "unreachable"
  | "drifted"
  | "updated_upstream"

export type ResolvedMember = {
  memberId: string
  source: MemberSource
  kind: MemberKind
  name: string
  pinnedVersion: string | null
  pinnedDigest: string | null
  currentVersion: string | null
  currentDigest: string | null
  status: MemberStatusCode
  /** Human-readable, always names the member. Null only when nothing is wrong. */
  reason: string | null
  blocksInstall: boolean
  blocksPublish: boolean
  /**
   * The manifest entry this member resolved to, and null when it did not
   * resolve at all.
   *
   * Carried on the member rather than beside it so the publish gate can build
   * the assembled document straight from the verdicts it is already holding:
   * `entries: members.map((member) => member.entry)`. `resolveLoadoutEntries`
   * derives its array from exactly this field, so the two cannot describe
   * different sets -- which is the same rule the entry itself follows (D4:
   * one derivation of "what this artifact publishes", never two beside each
   * other).
   *
   * The entry advertises its artifacts at whatever `baseUrl` and `token` the
   * resolution was given. A health read supplies a measurement pair, so the
   * URLs on an entry from `resolveLoadoutMembers` or `readLoadoutHealth`
   * measure correctly and are not fetchable. Anything serving these bytes to
   * an agent goes through `resolveLoadoutForInstall`, which requires the real
   * pair.
   */
  entry: LoadoutManifestEntry | null
  /**
   * Where to read about this member: its workspace page when it is private,
   * its marketplace page when it is public, and null when it did not resolve
   * (specs/loadout-member-health -- "Each member carries a link to its own
   * page").
   *
   * Computed here rather than by the caller because the resolver is the only
   * place that already knows which source the member came from. A screen
   * assembling the link itself would be re-deriving that fact somewhere it
   * can drift -- which is what a member card was doing when it joined on
   * `name` against the organization's artifact list.
   *
   * Non-null exactly when `entry` is non-null, and for the same reason: both
   * describe a member that actually resolved to something.
   */
  href: string | null
}

export type LoadoutHealth = {
  loadoutId: string
  members: ResolvedMember[]
  /**
   * The upstream release identifier this result was verified against, and
   * null for a loadout with no public members -- such a loadout has nothing
   * upstream to go stale (loadout-member-health -- "Loadout with only private
   * members"). Null is also what an unreachable upstream records, so a later
   * poll re-marks rather than treating the failure as a verified state.
   */
  releaseTag: string | null
  verifiedAt: string
  /**
   * True when this read found the loadout marked as needing re-verification,
   * i.e. an upstream release had moved since it was last verified. The result
   * beside it is already the re-verified one -- this says the owner is being
   * shown an answer that had gone stale, which is what the mark exists to
   * tell them.
   */
  wasStale: boolean
  /**
   * Always true, and kept rather than removed because callers read it.
   *
   * It used to distinguish a fresh verification from a recorded one held in
   * this process. Nothing is held any more (see `getLoadoutVerificationRecord`
   * on why the state had to become columns), so every read verifies and the
   * honest value is a constant. `wasStale` is the field that now carries
   * information.
   */
  reverified: boolean
  installable: boolean
  publishable: boolean
}

export type LoadoutEntryResolution = {
  /**
   * The upstream release this resolution read, and null for a loadout with no
   * public member -- such a loadout never touches upstream, so it has no
   * release to have been verified against.
   */
  releaseTag: string | null
  members: ResolvedMember[]
  /**
   * The entries the members resolved to, in the same order, or null when any
   * member did not resolve. Never a partial set: a document or a digest built
   * over the members that happen to work is the "graceful degradation that is
   * not" the whole install gate exists to refuse (design.md).
   */
  entries: LoadoutManifestEntry[] | null
}

/**
 * Where a private member's entry advertises its artifacts.
 *
 * A digest never depends on this: `toolEntryArtifactDigest` and
 * `skillEntryArtifactDigest` are taken over the artifacts' SHA-256 strings
 * (and, for a tool, its asset paths), never over the URLs the entry carries.
 * A *document measurement* does -- the token is the longest part of every URL
 * and there is one URL per published artifact per member -- so a caller that
 * measures or serves passes the real pair, and a caller that only wants
 * health gets a placeholder of the right shape and length.
 *
 * Minting a real token here instead would be a live credential nobody asked
 * for on a path that runs on a page load; verification.ts declines the same
 * thing for the same reason, and this is its `measurementToken` over a
 * loadout-scoped claim (task 6.1 settles the claim's real fields; what
 * matters to a measurement is that the length is a real token's length).
 */
function resolutionContext(input: {
  loadoutId: string
  organizationId: string
  baseUrl?: string
  token?: string
}): { baseUrl: string; token: string } {
  let baseUrl = input.baseUrl
  if (!baseUrl) {
    try {
      baseUrl = requireCatalogOriginBaseUrl()
    } catch (error) {
      if (!(error instanceof CatalogOriginError)) throw error
      // Same length class as a real origin, so a document measured through
      // this path stays meaningful on a deployment whose origin is unset.
      baseUrl = "https://catalog-origin.invalid"
    }
  }

  const claims = JSON.stringify({
    organizationId: input.organizationId,
    loadoutId: input.loadoutId,
    exp: Math.floor(Date.now() / 1000),
  })
  const token =
    input.token ??
    `v1.${Buffer.from(claims, "utf8").toString("base64url")}.${"s".repeat(43)}`

  return { baseUrl, token }
}

type UpstreamCatalog =
  | {
      reachable: true
      releaseTag: string
      tools: Map<string, HubToolEntry>
      skills: Map<string, HubSkillEntry>
    }
  | { reachable: false; error: string }

/** What a loadout's two verification columns say about it. */
export type LoadoutVerificationState = {
  loadoutId: string
  /** The upstream release last verified against; null means never verified. */
  verifiedReleaseTag: string | null
  needsReverification: boolean
}

/**
 * The verification state lives in two columns on `PrivateArtifact`
 * (`verifiedReleaseTag`, `needsReverification`), not in this process.
 *
 * That is not an optimization, it is the whole mechanism: the poll that marks
 * a loadout and the read that acts on the mark are different processes in a
 * serverless deployment, so a mark held in memory would never reach the owner
 * it exists to warn (schema.prisma, on `verifiedReleaseTag`). A null tag means
 * never verified, and there is no backfill -- writing today's release tag onto
 * an existing loadout would claim a verification that never happened and
 * silence exactly the loadouts the mark exists to warn about.
 *
 * Neither write below moves `updatedAt`: each carries the row's existing value
 * forward explicitly, which Prisma applies in place of its `@updatedAt`
 * annotation. Deliberate. The workspace lists artifacts by `updatedAt`
 * descending (`listPrivateArtifacts`), and one upstream release marks *every*
 * loadout holding a public member at once -- letting that bump the timestamp
 * would lift an owner's whole loadout shelf above the tool they edited
 * yesterday, on an event nobody in their organization caused. `updatedAt`
 * answers "when did someone last change this artifact", and neither of these
 * writes is someone changing it.
 */
export async function getLoadoutVerificationRecord(
  loadoutId: string
): Promise<LoadoutVerificationState | undefined> {
  const loadout = await prisma.privateArtifact.findFirst({
    where: { id: loadoutId },
    select: {
      id: true,
      verifiedReleaseTag: true,
      needsReverification: true,
    },
  })
  if (!loadout) return undefined
  return {
    loadoutId: loadout.id,
    verifiedReleaseTag: loadout.verifiedReleaseTag,
    needsReverification: loadout.needsReverification,
  }
}

/**
 * Marks a loadout as needing re-verification.
 *
 * Unscoped by organization on purpose: this is a system-side status write --
 * the release poll and the composition service reach it with ids they already
 * hold -- not a read anyone is served. Everything that shows this state to a
 * person goes through `readLoadoutHealth`, which scopes.
 *
 * Exported because the release poll is not the only event that invalidates a
 * verification: adding or removing a member changes what was verified, and
 * those paths live in the composition service.
 */
export async function markLoadoutStale(loadoutId: string) {
  const loadout = await prisma.privateArtifact.findFirst({
    where: { id: loadoutId },
    select: { id: true, needsReverification: true, updatedAt: true },
  })
  // Already marked is already correct; writing it again would only cost a
  // round trip.
  if (!loadout || loadout.needsReverification) return
  await prisma.privateArtifact.update({
    where: { id: loadout.id },
    data: { needsReverification: true, updatedAt: loadout.updatedAt },
  })
}

/**
 * Records what a completed resolution verified, clearing any mark it answered.
 *
 * Conditional, because a verification that agrees with what the row already
 * says has nothing to record -- and every loadout read runs one of these, so
 * an unconditional write would put a database write on every page view of a
 * healthy loadout.
 */
async function recordVerification(
  loadout: {
    id: string
    verifiedReleaseTag: string | null
    needsReverification: boolean
    updatedAt: Date
  },
  releaseTag: string | null
) {
  if (
    loadout.verifiedReleaseTag === releaseTag &&
    !loadout.needsReverification
  ) {
    return
  }
  await prisma.privateArtifact.update({
    where: { id: loadout.id },
    data: {
      verifiedReleaseTag: releaseTag,
      needsReverification: false,
      updatedAt: loadout.updatedAt,
    },
  })
}

/**
 * Resolves every member of a loadout and reports what each one is now.
 *
 * Always fresh: it re-reads private members from storage and re-fetches the
 * upstream catalog, ignoring any recorded result. That is what makes it usable
 * as the install-time check (loadout-member-health -- "Install never trusts a
 * cached result"); `readLoadoutHealth` is the lazy caller that decides whether
 * a read needs this at all.
 *
 * Returns findings rather than throwing for a member problem -- the caller
 * wants the whole list, and both gates below name every failing member rather
 * than only the first (private-loadouts -- "Several failing members").
 *
 * Members come back ordered by kind then name, which is the order the loadout
 * digest is taken in (design.md -- "The loadout digest formula mirrors the
 * agent's existing families"), so a caller never has to re-sort to stay
 * deterministic.
 */
export async function resolveLoadoutMembers(input: {
  loadoutId: string
  organizationId: string
  loadoutVisibility: "private" | "public"
}): Promise<ResolvedMember[]> {
  const { members } = await resolveLoadout(input)
  return members
}

/**
 * The same resolution, plus the published entry each member resolved to.
 *
 * The publish gate has to assemble the whole manifest document to measure it
 * against the agent's ceiling, and the install path has to digest the same
 * entries -- and both need a *public* member as a `HubToolEntry` or
 * `HubSkillEntry`, which requires the upstream resolution this module already
 * does. Resolving public members a second time in either of those places would
 * create two ideas of what a member currently is, which is precisely the
 * disagreement the pin exists to detect. So they take the entries from here.
 *
 * `entries` is deliberately nullable rather than partial: it is null whenever
 * any member failed to resolve, so a document or a digest can never be built
 * over the healthy members alone (private-loadouts -- "The hub SHALL NOT serve
 * a manifest containing only the healthy members"). `members` still carries
 * every finding, so the caller refuses naming them.
 *
 * The array is ordered exactly as `members` is -- by kind then name -- and can
 * be passed straight to `privateManifestDocument` and
 * `loadoutEntryArtifactDigest`.
 */
export async function resolveLoadoutEntries(input: {
  loadoutId: string
  organizationId: string
  loadoutVisibility: "private" | "public"
  /** The real pair when the caller measures or serves the document; see
   * `resolutionContext` for why it changes a measurement and not a digest. */
  baseUrl?: string
  token?: string
}): Promise<LoadoutEntryResolution> {
  return resolveLoadout(input)
}

/**
 * The install path's form: verify unconditionally, refuse naming any broken
 * member, and hand back entries that are guaranteed complete.
 *
 * `baseUrl` and `token` are required here and optional above, because these
 * entries are the ones an agent downloads from: a placeholder URL would
 * produce a document that digests correctly and cannot be fetched.
 */
export async function resolveLoadoutForInstall(input: {
  loadoutId: string
  organizationId: string
  loadoutVisibility: "private" | "public"
  baseUrl: string
  token: string
}): Promise<{ members: ResolvedMember[]; entries: LoadoutManifestEntry[] }> {
  const { members, entries } = await resolveLoadout(input)
  assertNothingBlocksInstall(members)
  if (!entries) {
    // Unreachable in practice: every member without an entry blocks the
    // install and is refused above. Kept as a hard stop rather than a
    // non-null assertion, because "serve the members that resolved" is the
    // exact failure this module exists to prevent.
    throw new Response(
      "Loadout cannot be installed: one or more members did not resolve to a publishable entry",
      { status: 409 }
    )
  }
  return { members, entries }
}

async function resolveLoadout(input: {
  loadoutId: string
  organizationId: string
  loadoutVisibility: "private" | "public"
  baseUrl?: string
  token?: string
}): Promise<LoadoutEntryResolution> {
  const loadout = await prisma.privateArtifact.findFirst({
    where: { id: input.loadoutId, organizationId: input.organizationId },
    include: { members: true },
  })
  if (!loadout) {
    throw new Response("Loadout not found", { status: 404 })
  }
  if (loadout.type !== "loadout") {
    throw new Response(
      `Artifact ${loadout.name} is not a loadout, so it has no members`,
      { status: 409 }
    )
  }

  const rows = [...loadout.members].sort(compareMemberRows)
  const hasPublicMember = rows.some((row) => row.source === "public")

  // Not fetched for a private-only loadout, which is the same fact that keeps
  // such a loadout out of the release poll: it has no upstream, so there is
  // nothing to be reachable or stale.
  const upstream: UpstreamCatalog | null = hasPublicMember
    ? await loadUpstreamCatalog()
    : null

  const context = resolutionContext({
    loadoutId: loadout.id,
    organizationId: input.organizationId,
    baseUrl: input.baseUrl,
    token: input.token,
  })

  const members: ResolvedMember[] = []
  for (const row of rows) {
    members.push(
      row.source === "public"
        ? resolvePublicMember(row, upstream)
        : await resolvePrivateMember(row, {
            organizationId: input.organizationId,
            loadoutVisibility: input.loadoutVisibility,
            ...context,
          })
    )
  }

  const releaseTag = upstream?.reachable ? upstream.releaseTag : null
  await recordVerification(loadout, releaseTag)

  return {
    releaseTag,
    members,
    // Derived from the members, never assembled a second time: the
    // all-or-nothing guarantee is then a property of one array rather than an
    // agreement between two.
    entries: members.every((member) => member.entry !== null)
      ? members.map((member) => member.entry as LoadoutManifestEntry)
      : null,
  }
}

type MemberRow = {
  id: string
  source: string
  kind: string
  name: string
  version: string | null
  artifactId: string | null
  pinnedDigest: string | null
}

function compareMemberRows(left: MemberRow, right: MemberRow): number {
  if (left.kind !== right.kind) return left.kind < right.kind ? -1 : 1
  if (left.name !== right.name) return left.name < right.name ? -1 : 1
  return left.id < right.id ? -1 : 1
}

/**
 * A member's identity in prose, used by every reason string.
 *
 * Every reason names the member, because the whole point of running these
 * checks in the hub rather than letting the agent fail is attribution: a
 * refusal that does not say *which* tool broke is the agent's error message
 * again, in a different place (design.md -- "Refuse the whole install when one
 * member is broken").
 */
function memberLabel(member: {
  source: MemberSource
  kind: MemberKind
  name: string
}) {
  const origin = member.source === "public" ? "Public" : "Private"
  return `${origin} ${member.kind} "${member.name}"`
}

async function resolvePrivateMember(
  row: MemberRow,
  context: {
    organizationId: string
    loadoutVisibility: "private" | "public"
    baseUrl: string
    token: string
  }
): Promise<ResolvedMember> {
  const kind = row.kind as MemberKind
  const label = memberLabel({ source: "private", kind, name: row.name })
  const base = {
    memberId: row.id,
    source: "private" as const,
    kind,
    name: row.name,
    pinnedVersion: row.version,
    pinnedDigest: row.pinnedDigest,
  }

  // Addressed by `artifactId` when the row carries one, which the composition
  // service always sets for a private member (schema.prisma -- the RESTRICT
  // delete rule protects exactly the rows that carry the pointer). The name
  // fallback exists so a row written before that rule is still resolvable
  // rather than silently reported as missing; note it is never a bare
  // `findFirst` on an undefined id, which would match an unrelated artifact.
  const artifact = await prisma.privateArtifact.findFirst({
    where: row.artifactId
      ? { id: row.artifactId, organizationId: context.organizationId }
      : { organizationId: context.organizationId, type: kind, name: row.name },
  })

  if (!artifact) {
    return {
      ...base,
      currentVersion: null,
      currentDigest: null,
      status: "missing",
      reason: `${label} is no longer in this organization`,
      blocksInstall: true,
      blocksPublish: true,
      entry: null,
      href: null,
    }
  }

  const isDraft = artifact.status !== "published"
  // Only ever true for a public loadout holding a private member. Everyone in
  // an organization already reaches every artifact it owns, so this is not an
  // access control between colleagues -- it is the case where publishing the
  // loadout would serve private bytes to installers outside the organization
  // (design.md -- "The member visibility gate protects public loadouts").
  // It blocks the install too, not only the publish, because that is the
  // moment the bytes would actually leave.
  const visibilityTooNarrow =
    context.loadoutVisibility === "public" && artifact.visibility !== "public"

  let entry: PrivateArtifactEntry | null = null
  let entryFailure: string | null = null
  try {
    entry = await buildPrivateArtifactEntry({
      organizationId: context.organizationId,
      artifactId: artifact.id,
      token: context.token,
      baseUrl: context.baseUrl,
    })
  } catch (error) {
    // The builder reports "this artifact cannot be published as it stands" as
    // a 409 -- a missing required content kind, or a declared asset with no
    // stored counterpart. For a member that is the same thing as being
    // unresolvable, so it is reported here rather than raised: the loadout's
    // owner needs the member's name attached to it.
    if (error instanceof Response && error.status === 409) {
      entryFailure = await error.text()
    } else if (error instanceof Response && error.status === 404) {
      entryFailure = "the artifact is not readable in this organization"
    } else {
      throw error
    }
  }

  const currentDigest = entry ? entryArtifactDigest(entry) : null
  const drifted =
    row.pinnedDigest !== null &&
    currentDigest !== null &&
    currentDigest !== row.pinnedDigest

  const reasons: string[] = []
  if (isDraft) {
    reasons.push(`${label} is still a draft`)
  }
  if (visibilityTooNarrow) {
    reasons.push(
      `${label} is ${artifact.visibility}, which is more restrictive than this loadout`
    )
  }
  if (entryFailure) {
    reasons.push(`${label} cannot be resolved: ${entryFailure}`)
  }
  if (drifted) {
    reasons.push(
      `${label} has changed since this loadout was published (pinned ${row.pinnedDigest}, now ${currentDigest}); re-pin the loadout to publish the new content`
    )
  }

  // Priority is presentational only -- what an install or a publish refuses on
  // is decided by the two flags below, from the facts, so a member that is
  // both a draft and drifted still blocks the install its drift blocks.
  const status: MemberStatusCode = entryFailure
    ? "missing"
    : isDraft
      ? "draft"
      : visibilityTooNarrow
        ? "visibility_too_narrow"
        : drifted
          ? "drifted"
          : "ok"

  return {
    ...base,
    currentVersion: artifact.version,
    currentDigest,
    status,
    reason: reasons.length > 0 ? reasons.join("; ") : null,
    blocksInstall: Boolean(entryFailure) || visibilityTooNarrow || drifted,
    // Drift is deliberately absent here, where it blocks the install beside
    // it. Publishing is what re-records every member's pins
    // (`pinLoadoutMembers`, run by `publishPrivateArtifact` once this gate
    // passes), so publishing is the repair for a drifted loadout
    // (specs/loadout-member-health -- "Publishing a changed loadout re-pins
    // it"). Blocking publication on drift would refuse the only action that
    // clears it, and a drifted loadout could never be repaired at all.
    blocksPublish: Boolean(entryFailure) || isDraft || visibilityTooNarrow,
    entry,
    // No link when the entry could not be built: that member did not resolve,
    // and the spec offers no link for one that did not.
    href: entry ? `/dashboard/manage/${artifact.id}` : null,
  }
}

function resolvePublicMember(
  row: MemberRow,
  upstream: UpstreamCatalog | null
): ResolvedMember {
  const kind = row.kind as MemberKind
  const label = memberLabel({ source: "public", kind, name: row.name })
  const base = {
    memberId: row.id,
    source: "public" as const,
    kind,
    name: row.name,
    pinnedVersion: row.version,
    pinnedDigest: row.pinnedDigest,
    currentVersion: null,
    currentDigest: null,
  }

  // Unreachable and removed are separate statuses on purpose
  // (loadout-member-health -- "Upstream unreachable"). An outage that read as
  // a deletion would tell an owner to rebuild a loadout that is fine, and a
  // deletion that read as an outage would tell them to wait for a tool that is
  // never coming back.
  if (!upstream || !upstream.reachable) {
    return {
      ...base,
      status: "unreachable",
      reason: `${label} could not be checked: the upstream catalog is unreachable (${upstream ? upstream.error : "not fetched"}). This is an availability failure, not a removal`,
      blocksInstall: true,
      blocksPublish: true,
      entry: null,
      href: null,
    }
  }

  // A public soul is looked up among skills because a soul *is* published as a
  // skill entry with no bundled files -- the agent has no souls array
  // (manifest.ts -- soulEntry). The same fact makes the digest below correct
  // for both.
  const entry =
    kind === "tool"
      ? upstream.tools.get(row.name)
      : upstream.skills.get(row.name)

  if (!entry) {
    return {
      ...base,
      status: "missing",
      reason: `${label} is no longer published in the verified public catalog (release ${upstream.releaseTag}). It was removed upstream rather than being temporarily unavailable`,
      blocksInstall: true,
      blocksPublish: true,
      entry: null,
      href: null,
    }
  }

  let currentDigest: string
  try {
    currentDigest =
      kind === "tool"
        ? toolEntryArtifactDigest(entry as HubToolEntry)
        : publicSkillDigest(kind, entry as HubSkillEntry)
  } catch (error) {
    // `toolEntryArtifactDigest` throws on an entry the agent could not parse
    // at all (no capabilities artifact, C7). Such an entry is present but not
    // installable, which is a resolution failure with a different sentence.
    return {
      ...base,
      currentVersion: entry.version,
      status: "missing",
      reason: `${label} resolves to an entry the agent cannot install: ${error instanceof Error ? error.message : String(error)}`,
      blocksInstall: true,
      blocksPublish: true,
      entry: null,
      href: null,
    }
  }

  const changed =
    row.pinnedDigest !== null && currentDigest !== row.pinnedDigest

  return {
    ...base,
    currentVersion: entry.version,
    currentDigest,
    status: changed ? "updated_upstream" : "ok",
    // Reported, never swallowed, and never blocking. design.md -- "Pin by
    // source": upstream's release cadence is not the loadout owner's to
    // control, and the installer can do even less about it, so the difference
    // becomes a notice on the owner's screens rather than a refused install.
    reason: changed
      ? `${label} was updated upstream since this loadout was published (pinned ${row.pinnedDigest}, now ${currentDigest}); installs continue with the current bytes`
      : null,
    blocksInstall: false,
    blocksPublish: false,
    // A public member's entry is the upstream one, unchanged: its artifact
    // URLs already point at the hub's catalog proxy (`hubArtifactUrl` in
    // manifest.server.ts), which is what "resolved live, no bytes copied"
    // means at the document level.
    entry:
      kind === "tool"
        ? { type: "tool", tool: entry as HubToolEntry }
        : kind === "soul"
          ? { type: "soul", skill: entry as HubSkillEntry }
          : { type: "skill", skill: entry as HubSkillEntry },
    href: publicMemberHref(kind, entry),
  }
}

/**
 * The marketplace page for a public member.
 *
 * The two halves of the public catalog address their items differently, and
 * the difference is not cosmetic -- a link built the wrong way 404s.
 *
 *   * A repository entry's slug *is* its name: the catalog reader derives a
 *     tool's and a skill's slug from its directory name
 *     (`lib/catalog/readers.server.ts`).
 *   * An Iliad entry's slug is an encoded `[userId, name, version]` triple
 *     (`createIliadSkillSlug`), and a manifest entry carries no userId.
 *
 * The identity is still recoverable: every Iliad artifact in the entry is
 * served through the hub proxy at a URL whose last segment is the base64url
 * of `["i", userId, name, version, file]` (`encodeArtifactRef` in
 * artifact-ref.server.ts). That is the only place the identity exists on this
 * side of the fetch, so the slug is built from it rather than guessed from
 * the name.
 *
 * `provenance` is the discriminant: `manifest.server.ts` stamps `official` on
 * every repository entry and one of the trust tiers on every Iliad one.
 */
function publicMemberHref(
  kind: MemberKind,
  entry: HubToolEntry | HubSkillEntry
): string | null {
  if (entry.provenance === "official") {
    return `/marketplace/${entry.name}`
  }

  const artifactUrl =
    kind === "tool"
      ? (entry as HubToolEntry).wasm.url
      : (entry as HubSkillEntry).skill_md.url
  const identity = iliadIdentityFromArtifactUrl(artifactUrl)
  if (!identity) return null

  // Only `userId`, `name` and `version` are read. Going through the shared
  // builder is what keeps the slug parseable by the marketplace page that has
  // to decode it again (`parseIliadSkillSlug`).
  return `/marketplace/${createIliadSkillSlug(identity as IliadPublicSkill)}`
}

function iliadIdentityFromArtifactUrl(
  url: string
): { userId: string; name: string; version: string } | null {
  try {
    const token = new URL(url).pathname.split("/").pop()
    if (!token) return null
    const ref = JSON.parse(Buffer.from(token, "base64url").toString("utf8"))
    if (!Array.isArray(ref) || ref[0] !== "i") return null
    const [, userId, name, version] = ref
    if (
      typeof userId !== "string" ||
      typeof name !== "string" ||
      typeof version !== "string"
    ) {
      return null
    }
    return { userId, name, version }
  } catch {
    // An unrecognised URL shape means no link rather than a broken one, and
    // never a failed resolution: the member itself is fine.
    return null
  }
}

function publicSkillDigest(kind: MemberKind, entry: HubSkillEntry): string {
  // Same value either way for an entry with no bundled files, and named apart
  // for the same reason ironclaw-contract.ts names them apart: the day souls
  // get an entry type of their own, the soul call site is already the one that
  // has to change.
  return kind === "soul"
    ? soulArtifactDigest(entry.skill_md.sha256)
    : skillEntryArtifactDigest(entry)
}

function entryArtifactDigest(entry: PrivateArtifactEntry): string {
  if (entry.type === "tool") return toolEntryArtifactDigest(entry.tool)
  if (entry.type === "soul")
    return soulArtifactDigest(entry.skill.skill_md.sha256)
  return skillEntryArtifactDigest(entry.skill)
}

async function loadUpstreamCatalog(): Promise<UpstreamCatalog> {
  try {
    // Imported here rather than at the top of the file, for two reasons that
    // point the same way. It is only ever needed by a loadout that has a
    // public member, so a private-only loadout should not pay to load the
    // catalog server module at all; and this module is reached from
    // `service.ts`, which is imported by tests that run under Node's
    // strip-only TypeScript mode -- `manifest.server.ts` declares a
    // constructor parameter property, which that mode cannot parse, so a
    // static import here would break every such test with a syntax error from
    // a file it never meant to load.
    const { buildUnifiedManifest } =
      await import("@/lib/catalog/manifest.server")
    const manifest = await buildUnifiedManifest()
    return {
      reachable: true,
      releaseTag: manifest.release_tag,
      tools: new Map(manifest.tools.map((tool) => [tool.name, tool])),
      skills: new Map(manifest.skills.map((skill) => [skill.name, skill])),
    }
  } catch (error) {
    // Everything the fetch can raise means the same thing here: the catalog
    // could not be read. `CatalogManifestError` for a non-200 release asset, a
    // bare `TypeError` for a DNS or socket failure. Neither says an entry is
    // gone, and neither is allowed to be reported as though it did.
    return {
      reachable: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * The read path: re-verify a loadout only when its recorded result no longer
 * describes it.
 *
 * "Lazily" is the requirement (loadout-member-health -- "Verification runs
 * lazily on read"), and a mark that never causes work would make it
 * unobservable. So a read re-verifies when the loadout is marked stale, when
 * it has never been verified, or when its visibility has changed since -- and
 * otherwise hands back what was recorded, with `reverified: false` so a caller
 * can say when the result is from.
 */
export async function readLoadoutHealth(input: {
  loadoutId: string
  organizationId: string
}): Promise<LoadoutHealth> {
  const loadout = await prisma.privateArtifact.findFirst({
    where: { id: input.loadoutId, organizationId: input.organizationId },
    select: { id: true, visibility: true, needsReverification: true },
  })
  if (!loadout) {
    throw new Response("Loadout not found", { status: 404 })
  }
  const loadoutVisibility =
    loadout.visibility === "public" ? "public" : "private"

  // Read before resolving, because resolving clears it.
  const wasStale = loadout.needsReverification

  const verifiedAt = new Date().toISOString()
  const { members, releaseTag } = await resolveLoadout({
    loadoutId: loadout.id,
    organizationId: input.organizationId,
    loadoutVisibility,
  })

  return health(loadout.id, members, releaseTag, verifiedAt, wasStale)
}

function health(
  loadoutId: string,
  members: ResolvedMember[],
  releaseTag: string | null,
  verifiedAt: string,
  wasStale: boolean
): LoadoutHealth {
  return {
    loadoutId,
    members,
    releaseTag,
    verifiedAt,
    wasStale,
    reverified: true,
    installable: members.every((member) => !member.blocksInstall),
    publishable: members.every((member) => !member.blocksPublish),
  }
}

/**
 * The install gate: verify every member, now, and refuse the whole loadout if
 * any of them is broken.
 *
 * Unconditional by construction -- it calls the resolver rather than the read
 * path, so no recorded result can shorten it (loadout-member-health --
 * "Install never trusts a cached result").
 *
 * Refuses the loadout entire rather than serving the members that are fine:
 * a trimmed set fails on the agent side anyway, as a hub defect with no member
 * name attached (design.md -- "Refuse the whole install when one member is
 * broken"). A public member updated upstream is not a break and does not reach
 * this refusal; only unresolvable members and drifted private members do.
 */
export async function assertLoadoutInstallable(input: {
  loadoutId: string
  organizationId: string
  loadoutVisibility: "private" | "public"
}): Promise<ResolvedMember[]> {
  const members = await resolveLoadoutMembers(input)
  assertNothingBlocksInstall(members)
  return members
}

/** The refusal itself, shared by both install-side entry points. */
function assertNothingBlocksInstall(members: ResolvedMember[]) {
  const broken = members.filter((member) => member.blocksInstall)
  if (broken.length > 0) {
    throw new Response(
      `Loadout cannot be installed: ${broken.map((member) => member.reason).join("; ")}`,
      { status: 409 }
    )
  }
}

/**
 * Polls the upstream release identifier and marks every published loadout that
 * holds a public member and was verified against a different one.
 *
 * One poll invalidates every affected loadout at once, which is both cheaper
 * and more complete than ranking loadouts by install demand (design.md --
 * "Staleness is driven by the upstream release identifier"). Iliad members
 * have no release identifier and are therefore not covered by this path at
 * all; they rely on the lazy read and the install-time check, which is the
 * weaker coverage design.md states rather than hides.
 *
 * A loadout with only private members is never marked: the query requires a
 * public member, so it cannot be (loadout-member-health -- "Loadout with only
 * private members").
 */
export async function pollUpstreamRelease(): Promise<{
  releaseTag: string | null
  unreachable: boolean
  markedLoadoutIds: string[]
}> {
  const upstream = await loadUpstreamCatalog()
  if (!upstream.reachable) {
    // Nothing is marked on an outage. A failed fetch is not evidence that the
    // release changed, and marking on it would re-verify every loadout in the
    // hub against an upstream that is still down.
    return { releaseTag: null, unreachable: true, markedLoadoutIds: [] }
  }

  const loadouts = await prisma.privateArtifact.findMany({
    where: {
      type: "loadout",
      status: "published",
      members: { some: { source: "public" } },
    },
    select: {
      id: true,
      verifiedReleaseTag: true,
      needsReverification: true,
      updatedAt: true,
    },
  })

  // The comparison the spec states: a loadout is marked when the upstream
  // identifier differs from the one *it* was verified against. A loadout that
  // was never verified has a null tag, differs from any release, and is
  // marked too.
  const stale = loadouts.filter(
    (loadout) => loadout.verifiedReleaseTag !== upstream.releaseTag
  )
  // Already-marked loadouts stay in the reported list -- they do need
  // re-verification against this release -- but are not written again.
  const unmarked = stale.filter((loadout) => !loadout.needsReverification)
  if (unmarked.length > 0) {
    await prisma.$transaction(
      unmarked.map((loadout) =>
        prisma.privateArtifact.update({
          where: { id: loadout.id },
          data: { needsReverification: true, updatedAt: loadout.updatedAt },
        })
      )
    )
  }
  const markedLoadoutIds = stale.map((loadout) => loadout.id)

  return {
    releaseTag: upstream.releaseTag,
    unreachable: false,
    markedLoadoutIds,
  }
}
