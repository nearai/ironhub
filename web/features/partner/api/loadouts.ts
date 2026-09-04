"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { fetchJson } from "./client"

/**
 * The client layer for loadout composition.
 *
 * Written against the routes the composition service exposes, following the
 * same react-query shape as `artifacts.ts`: one query key per resource, and
 * every mutation invalidating exactly what it changed. A loadout's items are
 * their own resource rather than a field on the artifact, because their health
 * is re-resolved on read while the artifact record is not.
 *
 * The vocabulary is deliberately split, and the split is bounded here. The
 * routes and their JSON envelopes say `items`, because that is what the
 * workspace calls artifacts everywhere an owner can read it. The types below
 * keep `ResolvedMember` and `memberId`, because those are the words the Prisma
 * model, the specs, and the document IronClaw is reading to answer asks 3, 4
 * and 5 all use (design.md -- "Items on the outside, members underneath").
 * This module is where the two meet; do not carry `items` any deeper.
 */

/** Where a member's bytes come from. A private member belongs to the loadout's
 *  own organization; a public one is a verified marketplace entry resolved
 *  live from upstream (design.md -- "Public members resolve live"). */
export type MemberSource = "private" | "public"

/** Leaves only. A loadout is never a member of a loadout. */
export type MemberKind = "tool" | "skill" | "soul"

/**
 * Every state a member can be reported in.
 *
 * `drifted` and `updated_upstream` are the same observation -- the bytes moved
 * since publish -- split by source, and they are deliberately not the same
 * status: a private member's owner caused the change and can undo it, so it
 * blocks installs, while a public member's author did and cannot, so it does
 * not (design.md -- "Pin by source").
 */
export type MemberStatus =
  | "ok"
  | "draft"
  | "visibility_too_narrow"
  | "missing"
  | "unreachable"
  | "drifted"
  | "updated_upstream"

export interface ResolvedMember {
  memberId: string
  source: MemberSource
  kind: MemberKind
  name: string
  /** What was recorded at publish. Null while the loadout is still a draft. */
  pinnedVersion: string | null
  pinnedDigest: string | null
  /** What resolves right now. Null when the member cannot be resolved at all. */
  currentVersion: string | null
  currentDigest: string | null
  status: MemberStatus
  /** The server's sentence for a non-`ok` status, shown verbatim. */
  reason: string | null
  blocksInstall: boolean
  blocksPublish: boolean
  /**
   * Where this item's own page is: `/dashboard/manage/<artifactId>` for a
   * private item, `/marketplace/<slug>` for a public one, and null when it
   * does not resolve and so has no page to point at.
   *
   * Computed by the resolver rather than here, because the resolver is the
   * only place that already knows which source the item came from. Never
   * rebuild it from `source` and `name` on this side.
   */
  href: string | null
}

/**
 * What identifies the member being added.
 *
 * The two sources are addressed differently: a private member is a row this
 * hub stores and is found by its artifact id, while a public member is an
 * entry the hub only resolves and is found by the name it carries in the
 * upstream manifest, with `kind` disambiguating a tool and a skill published
 * upstream under the same name. All four fields are sent for both, because the
 * server picks the field its source uses and the editor has all of them
 * anyway.
 */
export interface AddMemberInput {
  source: MemberSource
  kind: MemberKind
  name: string
  artifactId?: string
}

/**
 * A member row as it may arrive over the wire.
 *
 * The composition service stores a member (`id`, `version`, `pinnedDigest`) and
 * the health service resolves one (`memberId`, `status`, `currentDigest`), and
 * the member read is where the two meet. Accepting both shapes here means the
 * editor renders whichever the route is currently serving, rather than
 * rendering nothing while the two halves converge.
 */
type RawMember = Partial<ResolvedMember> & {
  id?: string
  version?: string | null
  source: MemberSource
  kind: MemberKind
  name: string
}

function normalizeMember(raw: RawMember): ResolvedMember {
  const pinnedVersion = raw.pinnedVersion ?? raw.version ?? null
  const pinnedDigest = raw.pinnedDigest ?? null

  return {
    memberId: raw.memberId ?? raw.id ?? `${raw.source}:${raw.kind}:${raw.name}`,
    source: raw.source,
    kind: raw.kind,
    name: raw.name,
    pinnedVersion,
    pinnedDigest,
    // A row with no resolution attached is reported as it stands, not as
    // drifted: the difference between pinned and current is only meaningful
    // once something has actually resolved, and inventing a mismatch from a
    // missing field would name a fault that was never observed.
    currentVersion: raw.currentVersion ?? pinnedVersion,
    currentDigest: raw.currentDigest ?? pinnedDigest,
    status: raw.status ?? "ok",
    reason: raw.reason ?? null,
    blocksInstall: raw.blocksInstall ?? false,
    blocksPublish: raw.blocksPublish ?? false,
    href: raw.href ?? null,
  }
}

const loadoutItemsKey = (id: string) =>
  ["private-artifacts", id, "items"] as const
const artifactChecksKey = (id: string) =>
  ["private-artifacts", id, "checks"] as const

/**
 * The loadout's members, resolved.
 *
 * This is a read that does work on the server: a loadout marked stale is
 * re-verified while it is being read (loadout-member-health spec --
 * "Verification runs lazily on read"), which is why member health is never
 * computed here from the artifact record.
 */
export function useLoadoutMembers(
  id: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: id
      ? loadoutItemsKey(id)
      : (["private-artifacts", "unknown", "items"] as const),
    queryFn: () =>
      fetchJson<{ items: RawMember[] }>(
        `/api/private-artifacts/${id}/items`
      ),
    // Defensive: tolerate a missing items array, and a row that carries only
    // the stored member record rather than a resolved one -- see
    // `normalizeMember`.
    select: (data) => (data.items ?? []).map(normalizeMember),
    enabled: Boolean(id) && (options?.enabled ?? true),
  })
}

export function useAddLoadoutMember(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddMemberInput) =>
      fetchJson<{ item: ResolvedMember }>(
        `/api/private-artifacts/${id}/items`,
        { method: "POST", body: JSON.stringify(input) }
      ),
    // The publish gate is computed from the members, so a membership change
    // invalidates the checks panel as surely as it does the member list.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: loadoutItemsKey(id) }),
        queryClient.invalidateQueries({ queryKey: artifactChecksKey(id) }),
      ]),
  })
}

export function useRemoveLoadoutMember(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) =>
      fetchJson<void>(`/api/private-artifacts/${id}/items/${memberId}`, {
        method: "DELETE",
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: loadoutItemsKey(id) }),
        queryClient.invalidateQueries({ queryKey: artifactChecksKey(id) }),
      ]),
  })
}

/** One verified public marketplace entry, as the member picker offers it. */
export interface PublicCandidate {
  /** The identifier a member row records. Public entries have no artifact id. */
  slug: string
  kind: "tool" | "skill"
  /** The human name, which is not the slug. */
  title: string
  version: string
  description: string | null
  category: string | null
}

/**
 * A curated bundle, offered in the picker only so a reader can add its
 * contents in one gesture.
 *
 * It is never a member: `buildCollectionBundles` derives a bundle from a
 * keyword query run over the catalog at request time, so what it holds changes
 * whenever the catalog does, and pinning something whose membership is not
 * fixed means nothing (design.md -- "Collections expand in the picker").
 */
export interface CandidateCollection {
  slug: string
  title: string
  summary: string
  items: PublicCandidate[]
}

/**
 * The verified public half of the picker. The organization's own half comes
 * from `useArtifacts()`, which already carries each candidate's type and
 * status.
 */
export function usePublicMemberCandidates(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["catalog", "entries"] as const,
    queryFn: () =>
      fetchJson<{
        entries: PublicCandidate[]
        collections: CandidateCollection[]
      }>("/api/catalog/entries"),
    select: (data) => ({
      entries: data.entries ?? [],
      collections: data.collections ?? [],
    }),
    // The public catalog changes on an upstream release, not between two
    // openings of a picker.
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  })
}

/** The identity two candidates are the same member under. */
export function memberIdentity(input: {
  source: MemberSource
  kind: MemberKind
  name: string
}) {
  return `${input.source}:${input.kind}:${input.name}`
}
