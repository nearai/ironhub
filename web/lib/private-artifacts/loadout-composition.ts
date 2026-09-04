// Composition of a loadout: which artifacts belong to it, and the gate that
// stands between a composed loadout and a published one.
//
// A loadout owns no bytes. Every other artifact type publishes content rows it
// uploaded; a loadout publishes *references*, and the only thing that makes
// those references worth anything is that they still point at something the
// installer is allowed to have. That is why the publish path here is a gate
// rather than a status flip: the checks in `assertLoadoutPublishable` are the
// entire difference between a loadout and a list of names.
//
// Two rules from design.md shape most of what follows and are easy to undo by
// accident:
//
//   * A pin is a fingerprint, not an address. No source retains a previous
//     version, so a member always resolves to whatever is current under its
//     recorded identity; the recorded version and digest exist to say whether
//     that is still what was published, not to fetch anything.
//   * The member visibility gate is not an intra-organization access control.
//     Everyone in an organization already reaches every artifact it owns. The
//     gate exists so a public loadout cannot serve private bytes to installers
//     outside the organization, which is also what makes a loadout-scoped
//     token safe to widen.
import { randomUUID } from "node:crypto"

import { MANIFEST_SIGNING_KEY_ID } from "@/lib/catalog/manifest-signing.server"
import {
  MAX_MANIFEST_BYTES,
  MAX_SIGNED_MANIFEST_BYTES,
} from "@/lib/catalog/ironclaw-contract"
import type { HubManifest } from "@/lib/catalog/manifest-types"

import { prisma } from "../db"
import { Prisma } from "../prisma/client"
import {
  type MemberKind,
  type ResolvedMember,
  resolveLoadoutMembers,
} from "./loadout-health"
import {
  type LoadoutManifestEntry,
  privateManifestDocument,
} from "./manifest"

/**
 * The artifact types a loadout may hold. `loadout` is absent on purpose: the
 * type is leaves-only, one level, and this tuple is the enforcement rather
 * than a restatement of it (specs/private-loadouts -- "A loadout SHALL NOT
 * contain another loadout").
 */
export const LOADOUT_MEMBER_KINDS: readonly MemberKind[] = [
  "tool",
  "skill",
  "soul",
]

/**
 * Re-exported under the composition service's own name so a caller adding a
 * member depends on the vocabulary of composition rather than reaching into
 * member health for it. Same type, one definition.
 */
export type LoadoutMemberKind = MemberKind

export type AddLoadoutMemberInput =
  /** Identified by row id: a private member is an artifact this hub stores. */
  | { source: "private"; artifactId: string }
  /**
   * Identified by the name it carries in the upstream manifest, because that
   * is the only handle the resolver has. `kind` is optional and disambiguates
   * the one case where the name is not enough -- a tool and a skill published
   * upstream under the same name, which the member table's
   * (loadoutId, source, kind, name) index already contemplates.
   */
  | { source: "public"; name: string; kind?: MemberKind }

/**
 * Assembles the manifest document a loadout would publish.
 *
 * Injected rather than imported because the multi-entry builder lives in
 * `manifest.ts` and the Hub entries it needs are built inside
 * `loadout-health.ts` while resolving each member. The size check below needs
 * the *assembled* document -- one entry per member -- and there is no honest
 * way to measure that from member rows alone, so the seam is the document, not
 * a byte estimate.
 *
 * The implementation this is shaped for is one line over what has already
 * landed, once `resolveLoadoutMembers` carries each member's
 * `LoadoutManifestEntry`:
 *
 *     ({ loadoutId, members }) =>
 *       privateManifestDocument({
 *         artifactId: loadoutId,
 *         entries: members.map((member) => member.entry),
 *         generatedAt: new Date().toISOString(),
 *       })
 *
 * The members are handed over already ordered by kind then name, which is the
 * order `resolveLoadoutMembers` returns and the order the loadout digest is
 * taken in, so an assembler never has to re-sort to stay deterministic.
 */
export type LoadoutDocumentAssembler = (input: {
  organizationId: string
  loadoutId: string
  members: ResolvedMember[]
}) => Promise<HubManifest>

export type LoadoutPublishOptions = {
  assembleDocument?: LoadoutDocumentAssembler
}

/**
 * The assembler the publish gate is wired with.
 *
 * It builds nothing of its own: every entry was already built while the member
 * was resolved, and this reads them off the verdicts the gate is holding. That
 * is the point -- one derivation of "what this loadout publishes", never a
 * second one measured beside it (design.md D4), which is also why
 * `resolveLoadoutEntries` derives its array from the same `entry` field.
 *
 * The URLs on these entries carry the measurement baseUrl and token a health
 * resolution supplies. Correct for measuring a document against the agent's
 * ceiling, and deliberately not fetchable: anything serving these bytes to an
 * agent goes through `resolveLoadoutForInstall`, which requires the real pair.
 */
export const loadoutDocumentAssembler: LoadoutDocumentAssembler = async ({
  loadoutId,
  members,
}) => {
  const entries: LoadoutManifestEntry[] = []
  for (const member of members) {
    if (!member.entry) {
      // Unreachable in practice -- a member that resolved to no entry blocks
      // publication before the size check runs -- but the alternative to
      // saying so is measuring a document with a member silently missing from
      // it, which would pass a ceiling the real document might not.
      throw new Response(
        `Loadout cannot be published: ${member.kind} ${member.name} did not resolve to a publishable entry`,
        { status: 409 }
      )
    }
    entries.push(member.entry)
  }

  return privateManifestDocument({
    artifactId: loadoutId,
    entries,
    generatedAt: new Date().toISOString(),
  })
}

/**
 * What the upstream catalog currently publishes, as the names an author may
 * pin. Injected rather than imported for two reasons that point the same way:
 * the catalog reader is only needed when a public member is added, and this
 * module is on the publish path of every artifact type, so importing it here
 * would put a network-backed fetch stack into a module graph that almost never
 * uses it.
 */
export type PublicCatalogLookup = () => Promise<{
  tools: readonly { name: string }[]
  skills: readonly { name: string }[]
}>

export type AddLoadoutMemberOptions = {
  lookupPublicCatalog?: PublicCatalogLookup
}

/**
 * Deferred to call time on purpose -- see `PublicCatalogLookup`. It is the same
 * document member health resolves against, which is what keeps "addable" and
 * "resolvable" from being two different questions.
 */
const defaultPublicCatalogLookup: PublicCatalogLookup = async () => {
  const { buildUnifiedManifest } = await import("../catalog/manifest.server")
  return buildUnifiedManifest()
}

/** Ed25519 signatures are 64 bytes, which is 86 base64url characters. */
const SIGNATURE_BASE64URL_LENGTH = 86

const MEMBER_SELECT = {
  id: true,
  source: true,
  kind: true,
  name: true,
  version: true,
  artifactId: true,
  pinnedDigest: true,
  createdAt: true,
} as const

export type LoadoutMemberRow = {
  id: string
  source: string
  kind: string
  name: string
  version: string | null
  artifactId: string | null
  pinnedDigest: string | null
  createdAt: Date
}

/**
 * Loads the loadout every operation here is scoped to.
 *
 * Scoped by organization for the same reason the rest of the private artifact
 * surface is: a loadout belonging to another organization is not a 403 with a
 * hint in it, it is a 404. Composition adds one rule on top -- the artifact
 * has to actually be a loadout, since nothing else has members.
 */
async function requireLoadout(organizationId: string, loadoutId: string) {
  const loadout = await prisma.privateArtifact.findFirst({
    where: { id: loadoutId, organizationId },
    select: { id: true, type: true, name: true, visibility: true },
  })
  if (!loadout) {
    throw new Response("Loadout not found", { status: 404 })
  }
  if (loadout.type !== "loadout") {
    throw new Response(
      `Artifact ${loadout.name} is a ${loadout.type} and has no members`,
      { status: 409 }
    )
  }
  return loadout
}

/**
 * The stored rows, ordered by kind then name rather than by insertion, so
 * every reader walks the same sequence. Insertion order is not allowed to be
 * observable (specs/private-loadouts -- "Member order does not affect the
 * digest").
 *
 * This is what was *pinned*, which is a different question from what those
 * pins still describe. The member read route deliberately does not serve this:
 * it serves resolved members, because every question the loadout screen asks
 * is about resolution rather than about storage.
 */
export async function listLoadoutMembers(
  organizationId: string,
  loadoutId: string
): Promise<LoadoutMemberRow[]> {
  await requireLoadout(organizationId, loadoutId)

  return prisma.loadoutMember.findMany({
    where: { loadoutId },
    select: MEMBER_SELECT,
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  })
}

export async function addLoadoutMember(
  organizationId: string,
  loadoutId: string,
  input: AddLoadoutMemberInput,
  options: AddLoadoutMemberOptions = {}
): Promise<LoadoutMemberRow> {
  const loadout = await requireLoadout(organizationId, loadoutId)

  const member =
    input.source === "private"
      ? await resolvePrivateMemberToAdd(organizationId, input.artifactId)
      : await resolvePublicMemberToAdd(
          input.name,
          input.kind,
          options.lookupPublicCatalog ?? defaultPublicCatalogLookup
        )

  if (member.kind === "soul") {
    await assertNoExistingSoul(loadoutId)
  }

  try {
    return await prisma.loadoutMember.create({
      data: {
        id: randomUUID(),
        loadoutId: loadout.id,
        source: member.source,
        kind: member.kind,
        name: member.name,
        // Version and digest are deliberately left unset here. They are the
        // pin, and a pin is recorded at publish against what resolves at that
        // moment -- recording a draft's current version at add time would put
        // a number on the row that nothing ever promised (design.md -- "A
        // member records its identity; publish resolves and pins whatever is
        // current").
        artifactId: member.artifactId,
      },
      select: MEMBER_SELECT,
    })
  } catch (error) {
    // The (loadoutId, source, kind, name) unique index. Adding the same member
    // twice is a no-op the author meant, not a failure worth a stack trace,
    // but it still has to say why nothing changed.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Response(
        `${member.kind} ${member.name} is already a member of this loadout`,
        { status: 409 }
      )
    }
    throw error
  }
}

export async function removeLoadoutMember(
  organizationId: string,
  loadoutId: string,
  memberId: string
): Promise<LoadoutMemberRow> {
  await requireLoadout(organizationId, loadoutId)

  // Matched on both ids: a member id from another organization's loadout must
  // not delete anything, and scoping the delete by loadoutId is what makes
  // that true without a second lookup deciding it.
  const member = await prisma.loadoutMember.findFirst({
    where: { id: memberId, loadoutId },
    select: MEMBER_SELECT,
  })
  if (!member) {
    throw new Response("Loadout member not found", { status: 404 })
  }

  await prisma.loadoutMember.delete({ where: { id: member.id } })
  return member
}

/**
 * A private member is an artifact of this organization, recorded with the row
 * id it will always be resolved through.
 *
 * `artifactId` is not optional metadata here. The RESTRICT delete rule on
 * `LoadoutMember.artifactId` protects only the rows that carry the pointer, so
 * a private member recorded without it would be silently deletable out from
 * under a published loadout by a table that looks like it protects everything
 * (see the schema comment on the relation).
 */
async function resolvePrivateMemberToAdd(
  organizationId: string,
  artifactId: string
): Promise<{
  source: "private"
  kind: MemberKind
  name: string
  artifactId: string
}> {
  // Scoped by organization, which is what refuses a private artifact belonging
  // to a different one (specs/private-loadouts -- "Private member from another
  // organization"). The refusal is deliberately indistinguishable from an id
  // that does not exist: telling an author that some other organization owns
  // the id they guessed is the leak this scoping exists to prevent.
  const artifact = await prisma.privateArtifact.findFirst({
    where: { id: artifactId, organizationId },
    select: { id: true, type: true, name: true },
  })
  if (!artifact) {
    throw new Response("Artifact not found", { status: 404 })
  }

  if (artifact.type === "loadout") {
    throw new Response(
      `Loadouts cannot be nested: ${artifact.name} is itself a loadout`,
      { status: 409 }
    )
  }
  if (!isMemberKind(artifact.type)) {
    throw new Response(
      `Artifacts of type ${artifact.type} cannot be loadout members`,
      { status: 409 }
    )
  }

  return {
    source: "private",
    kind: artifact.type,
    name: artifact.name,
    artifactId: artifact.id,
  }
}

/**
 * A public member is a verified marketplace entry, recorded by the name it
 * resolves under and never copied into hub storage.
 *
 * "Verified" is not a separate flag to check: it is membership of the unified
 * manifest, which holds exactly what was merged into the IronHub release or
 * accepted by the Iliad backend. Resolving against that document rather than
 * against the browsable catalog is deliberate -- it is the same document
 * member health resolves against, so an entry accepted here is one that can
 * still be found later, and a name this hub browses but cannot install is
 * refused at the point an author can act on it.
 *
 * Collections never reach this path: they are not in the manifest, being a
 * keyword query run over the catalog at request time. The picker expands one
 * into its items, and pinning something whose membership is not fixed would
 * mean nothing (design.md -- "Collections expand in the picker; they are
 * never members").
 */
async function resolvePublicMemberToAdd(
  name: string,
  kind: MemberKind | undefined,
  lookupPublicCatalog: PublicCatalogLookup
): Promise<{
  source: "public"
  kind: MemberKind
  name: string
  artifactId: null
}> {
  let manifest: Awaited<ReturnType<PublicCatalogLookup>>
  try {
    manifest = await lookupPublicCatalog()
  } catch (error) {
    // Unreachable is not removed, and the two must never be reported as one
    // (loadout-member-health -- "Upstream unreachable"). An author told their
    // tool no longer exists would go looking for a replacement it does not
    // need.
    throw new Response(
      `The public catalog could not be read, so ${name} could not be verified: ${error instanceof Error ? error.message : String(error)}`,
      { status: 502 }
    )
  }

  const matches: MemberKind[] = []
  if (manifest.tools.some((tool) => tool.name === name)) matches.push("tool")
  if (manifest.skills.some((skill) => skill.name === name)) matches.push("skill")

  const candidates = kind ? matches.filter((match) => match === kind) : matches
  if (candidates.length === 0) {
    throw new Response(
      `No verified public ${kind ?? "artifact"} named ${name} is published upstream`,
      { status: 404 }
    )
  }
  if (candidates.length > 1) {
    throw new Response(
      `Upstream publishes both a tool and a skill named ${name}; say which kind to add`,
      { status: 409 }
    )
  }

  return { source: "public", kind: candidates[0], name, artifactId: null }
}

/**
 * At most one soul, checked before the insert rather than by an index.
 *
 * The unique index is on (loadoutId, source, kind, name), which stops the same
 * soul twice and nothing else -- two *different* souls satisfy it. The rule is
 * about the count, and the refusal has to name the soul already there so the
 * author knows what to remove (specs/private-loadouts -- "Adding a second
 * soul").
 */
async function assertNoExistingSoul(loadoutId: string) {
  const existing = await prisma.loadoutMember.findFirst({
    where: { loadoutId, kind: "soul" },
    select: { name: true },
  })
  if (existing) {
    throw new Response(
      `This loadout already has the soul ${existing.name}; remove it before adding another`,
      { status: 409 }
    )
  }
}

function isMemberKind(value: string): value is MemberKind {
  return (LOADOUT_MEMBER_KINDS as readonly string[]).includes(value)
}

/**
 * The publish gate, returning the resolution the pins are then written from.
 *
 * Order matters and is not incidental:
 *
 *   1. Emptiness, because an empty loadout has nothing to resolve and the
 *      message an author needs is about members, not about resolution.
 *   2. Member health, which reports *every* failing member. A loadout with
 *      three draft members is fixed in one pass or in three round trips, and
 *      the spec asks for the first ("Several failing members").
 *   3. Document size, which needs every member to have resolved first.
 *
 * Nothing here writes. Pinning is `pinLoadoutMembers`, called only once the
 * gate has passed, so a refused publish leaves the previous pins intact --
 * the loadout that was installable a moment ago still is.
 */
export async function assertLoadoutPublishable(
  organizationId: string,
  loadout: { id: string; visibility: string },
  options: LoadoutPublishOptions = {}
): Promise<ResolvedMember[]> {
  const members = await prisma.loadoutMember.findMany({
    where: { loadoutId: loadout.id },
    select: { id: true },
  })
  if (members.length === 0) {
    // A draft may be empty -- that is where a loadout starts, and refusing it
    // would make the type unusable before its first member. Only publication
    // is refused (specs/private-loadouts -- "An empty loadout cannot be
    // published").
    throw new Response(
      "Loadout cannot be published: a loadout must have at least one member",
      { status: 409 }
    )
  }

  const resolved = await resolveLoadoutMembers({
    loadoutId: loadout.id,
    organizationId,
    loadoutVisibility: loadout.visibility === "public" ? "public" : "private",
  })

  const blocking = resolved.filter((member) => member.blocksPublish)
  if (blocking.length > 0) {
    throw new Response(
      `Loadout cannot be published: ${blocking.map(describeBlockingMember).join("; ")}`,
      { status: 409 }
    )
  }

  const failures = await documentSizeFailures(
    organizationId,
    loadout.id,
    resolved,
    options.assembleDocument
  )
  if (failures.length > 0) {
    throw new Response(
      `Loadout cannot be published: ${failures.join("; ")}`,
      { status: 409 }
    )
  }

  return resolved
}

/**
 * `reason` is the resolver's own prose and always names the member, so it is
 * used verbatim. The fallback exists because a blocking member with no reason
 * is a resolver bug, and swallowing it would produce a refusal that names
 * nothing at all -- the one thing this message must never do.
 */
function describeBlockingMember(member: ResolvedMember): string {
  return member.reason ?? `${member.kind} ${member.name} is ${member.status}`
}

/**
 * C11's two ceilings, measured over the assembled document.
 *
 * Unreachable for a single artifact and reachable here: a loadout's document
 * carries one entry per member, and each entry carries a token-bearing URL per
 * published file. Twenty members is twenty times the document a tool produces,
 * which is why this is measured rather than argued about.
 *
 * The signed size is derived rather than produced. Signing needs the private
 * key, which a publish-time check has no business loading, and the envelope is
 * a fixed JSON skeleton plus base64 of the document plus a fixed-length
 * signature -- exact arithmetic, not an estimate. Mirrors `verifyDocumentSize`
 * in verification.ts on purpose; the two measure different documents under the
 * same contract.
 */
async function documentSizeFailures(
  organizationId: string,
  loadoutId: string,
  members: ResolvedMember[],
  assembleDocument: LoadoutDocumentAssembler | undefined
): Promise<string[]> {
  if (!assembleDocument) {
    // Fails closed rather than passing quietly. An unmeasured document is not
    // a document known to fit, and a loadout published past a check that never
    // ran breaks on the agent -- in a log its owner cannot see, which is the
    // exact failure publish-time verification exists to prevent
    // (verification.ts, "it is *attribution*"). A refusal that says the check
    // could not run is worse for nobody and honest about which it is.
    throw new Response(
      "Loadout cannot be published: its manifest document could not be assembled, so the agent's size ceiling could not be checked",
      { status: 409 }
    )
  }

  const document = await assembleDocument({
    organizationId,
    loadoutId,
    members,
  })
  return measureLoadoutDocument(document)
}

/**
 * Exported so the multi-entry builder and its tests measure the ceiling the
 * publish gate measures, rather than a second reading of the same constants.
 */
export function measureLoadoutDocument(document: HubManifest): string[] {
  const documentBytes = Buffer.byteLength(JSON.stringify(document), "utf8")

  const skeleton = JSON.stringify({
    v: 1,
    key_id: MANIFEST_SIGNING_KEY_ID,
    manifest_b64: "",
    sig: "s".repeat(SIGNATURE_BASE64URL_LENGTH),
  })
  const signedBytes =
    Buffer.byteLength(skeleton, "utf8") + Math.ceil((documentBytes * 4) / 3)

  const failures: string[] = []
  if (documentBytes > MAX_MANIFEST_BYTES) {
    failures.push(
      `the manifest document is ${documentBytes} bytes; the agent rejects anything above ${MAX_MANIFEST_BYTES}`
    )
  }
  if (signedBytes > MAX_SIGNED_MANIFEST_BYTES) {
    failures.push(
      `the signed manifest envelope is ${signedBytes} bytes; the agent rejects anything above ${MAX_SIGNED_MANIFEST_BYTES}`
    )
  }
  return failures
}

/**
 * Records what each member resolved to at the moment of publication.
 *
 * Kind, source, and name were recorded when the member was added and do not
 * move -- they are the member's identity. Version and digest are the pin, and
 * they are written from what currently resolves, because that is the only
 * thing any source can still serve (design.md -- "A pin is a fingerprint, not
 * an address").
 *
 * Writes are per row rather than one `updateMany`: every row takes a different
 * pair of values, so there is nothing to batch.
 */
export async function pinLoadoutMembers(members: ResolvedMember[]) {
  for (const member of members) {
    await prisma.loadoutMember.update({
      where: { id: member.memberId },
      data: {
        version: member.currentVersion,
        pinnedDigest: member.currentDigest,
      },
    })
  }
}
