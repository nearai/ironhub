"use client"

import { useMemo, useState } from "react"
import {
  IconAlertTriangle,
  IconBoxMultiple,
  IconCheck,
  IconLoader2,
  IconLock,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconTool,
  IconUserHeart,
  IconWorld,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"
import { useArtifacts } from "@/features/partner/api/artifacts"
import {
  memberIdentity,
  useAddLoadoutMember,
  usePublicMemberCandidates,
  useRemoveLoadoutMember,
  type AddMemberInput,
  type CandidateCollection,
  type MemberKind,
  type MemberSource,
  type PublicCandidate,
  type ResolvedMember,
} from "@/features/partner/api/loadouts"
import { StatusBadge } from "@/features/partner/components/ui/status-badge"
import { cn } from "@/lib/shared/utils"

const KIND_ICONS: Record<
  MemberKind,
  React.ComponentType<{ className?: string }>
> = {
  skill: IconSparkles,
  tool: IconTool,
  soul: IconUserHeart,
}

const KIND_LABELS: Record<MemberKind, string> = {
  skill: "Skill",
  tool: "Tool",
  soul: "Soul",
}

const TABS = [
  { id: "all", label: "All" },
  { id: "skill", label: "Skills" },
  { id: "tool", label: "Tools" },
  { id: "soul", label: "Souls" },
  { id: "collection", label: "Collections" },
] as const

type TabId = (typeof TABS)[number]["id"]

/**
 * One row the picker can offer. A private candidate carries the workspace's
 * own draft/published status; a public one is verified by definition, since
 * unverified entries are never offered (design.md -- "Verified-only membership
 * is what makes live resolution safe").
 */
type Candidate = {
  identity: string
  source: MemberSource
  kind: MemberKind
  /** What a member row records. The artifact name, or the entry's slug. */
  name: string
  title: string
  version: string
  description: string | null
  category: string | null
  status: "draft" | "published" | null
  artifactId?: string
}

function publicCandidate(entry: PublicCandidate): Candidate {
  return {
    identity: memberIdentity({
      source: "public",
      kind: entry.kind,
      name: entry.slug,
    }),
    source: "public",
    kind: entry.kind,
    name: entry.slug,
    title: entry.title,
    version: entry.version,
    description: entry.description,
    category: entry.category,
    status: null,
  }
}

export interface LoadoutMemberPickerProps {
  loadoutId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The items as the server currently reports them -- the equipped state. */
  members: ResolvedMember[]
  /**
   * The tab to open on. The editor asks for one kind at a time -- its Soul,
   * Skills and Tools cards each have their own add control -- and "add from
   * collection" opens straight on Collections. The tabs stay visible either
   * way, so opening pre-filtered narrows the first screen without trapping
   * anyone in it.
   */
  initialTab?: TabId
}

/**
 * The member picker: the organization's own artifacts and the verified public
 * catalog, in one list, with each candidate's type and status on it.
 *
 * The status is here rather than at publish because that is the whole point of
 * showing it: an author who picks a draft learns it now, from the row they are
 * about to click, instead of from a publish refusal several steps later
 * (loadout-member-health spec -- "Member status is visible while composing").
 *
 * The visual register is carried over from the agent-builder's selection
 * drawer -- segmented tabs, one search field, filter selects, and a card per
 * candidate whose action reads Add or Added. What is not carried over is its
 * data layer: that drawer read the public marketplace only, and picked members
 * by slug with no version and no status.
 */
export function LoadoutMemberPicker({
  loadoutId,
  open,
  onOpenChange,
  members,
  initialTab = "all",
}: LoadoutMemberPickerProps) {
  const artifacts = useArtifacts()
  // Fetched only while the picker is open: the public catalog is assembled
  // upstream on every request, and a manage screen that never opens the picker
  // has no reason to ask for it.
  const publicCandidates = usePublicMemberCandidates({ enabled: open })
  const addMember = useAddLoadoutMember(loadoutId)
  const removeMember = useRemoveLoadoutMember(loadoutId)

  const [tab, setTab] = useState<TabId>(initialTab)
  const [query, setQuery] = useState("")
  const [source, setSource] = useState<"all" | MemberSource>("all")
  const [category, setCategory] = useState("all")
  const [sort, setSort] = useState<"name" | "kind">("name")
  const [error, setError] = useState<string | null>(null)
  const [pendingIdentity, setPendingIdentity] = useState<string | null>(null)
  const [collectionResult, setCollectionResult] = useState<string | null>(null)
  // Which (open, initialTab) pair the tab state was last synced to. Each time
  // the editor opens the picker from a different card it asks for a different
  // tab, and without this the second open would keep whatever tab the reader
  // left behind on the first -- so "Add Tool" could land on Skills.
  const [tabSyncedTo, setTabSyncedTo] = useState(`${open}:${initialTab}`)
  if (tabSyncedTo !== `${open}:${initialTab}`) {
    setTabSyncedTo(`${open}:${initialTab}`)
    if (open) {
      setTab(initialTab)
      setQuery("")
      setError(null)
      setCollectionResult(null)
    }
  }

  const byIdentity = useMemo(() => {
    const map = new Map<string, ResolvedMember>()
    for (const member of members) map.set(memberIdentity(member), member)
    return map
  }, [members])

  // A loadout holds at most one soul, so once there is one every other soul in
  // the list is unofferable. Saying which soul is already in the loadout is
  // what makes that a fact rather than a broken button.
  const existingSoul = members.find((member) => member.kind === "soul") ?? null

  const privateCandidates = useMemo<Candidate[]>(() => {
    const list = artifacts.data ?? []
    return list
      .filter(
        (artifact) =>
          // Leaves only -- a loadout is never a member of a loadout -- and
          // never the loadout being edited.
          artifact.type !== "loadout" && artifact.id !== loadoutId
      )
      .map((artifact) => ({
        identity: memberIdentity({
          source: "private",
          kind: artifact.type as MemberKind,
          name: artifact.name,
        }),
        source: "private" as const,
        kind: artifact.type as MemberKind,
        name: artifact.name,
        title: artifact.title,
        version: artifact.version,
        description: artifact.description,
        category: artifact.category,
        status: artifact.status,
        artifactId: artifact.id,
      }))
  }, [artifacts.data, loadoutId])

  const allCandidates = useMemo<Candidate[]>(
    () => [
      ...privateCandidates,
      ...(publicCandidates.data?.entries ?? []).map(publicCandidate),
    ],
    [privateCandidates, publicCandidates.data]
  )

  const categories = useMemo(() => {
    const values = allCandidates
      .map((candidate) => candidate.category)
      .filter((value): value is string => Boolean(value))
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))
  }, [allCandidates])

  const visibleCandidates = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = allCandidates.filter((candidate) => {
      if (tab !== "all" && tab !== "collection" && candidate.kind !== tab) {
        return false
      }
      if (source !== "all" && candidate.source !== source) return false
      if (category !== "all" && candidate.category !== category) return false
      if (needle === "") return true
      return [candidate.title, candidate.name, candidate.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    })

    return filtered.sort((a, b) =>
      sort === "kind" && a.kind !== b.kind
        ? a.kind.localeCompare(b.kind)
        : a.title.localeCompare(b.title)
    )
  }, [allCandidates, tab, source, category, query, sort])

  const visibleCollections = useMemo<CandidateCollection[]>(() => {
    const needle = query.trim().toLowerCase()
    const list = publicCandidates.data?.collections ?? []
    if (needle === "") return list
    return list.filter((collection) =>
      `${collection.title} ${collection.summary}`.toLowerCase().includes(needle)
    )
  }, [publicCandidates.data, query])

  const showCollections = tab === "all" || tab === "collection"
  const showCandidates = tab !== "collection"

  const describe = (thrown: unknown) =>
    thrown instanceof Error ? thrown.message : "Something went wrong."

  const handleToggle = async (candidate: Candidate) => {
    setError(null)
    setCollectionResult(null)
    const existing = byIdentity.get(candidate.identity)
    setPendingIdentity(candidate.identity)
    try {
      if (existing) {
        await removeMember.mutateAsync(existing.memberId)
      } else {
        await addMember.mutateAsync(toInput(candidate))
      }
    } catch (thrown) {
      setError(describe(thrown))
    } finally {
      setPendingIdentity(null)
    }
  }

  /**
   * Adds a collection's items as individual members, skipping anything already
   * in the loadout.
   *
   * The collection itself is never recorded. `buildCollectionBundles` derives
   * a bundle from a keyword query run over the catalog at request time, so its
   * contents are not fixed and a pin over them would mean nothing (design.md
   * -- "Collections expand in the picker; they are never members").
   */
  const handleAddCollection = async (collection: CandidateCollection) => {
    setError(null)
    setCollectionResult(null)
    setPendingIdentity(`collection:${collection.slug}`)

    const seen = new Set(byIdentity.keys())
    let added = 0
    let skipped = 0
    try {
      for (const entry of collection.items) {
        const candidate = publicCandidate(entry)
        if (seen.has(candidate.identity)) {
          skipped += 1
          continue
        }
        seen.add(candidate.identity)
        await addMember.mutateAsync(toInput(candidate))
        added += 1
      }
      setCollectionResult(
        skipped === 0
          ? `Added ${added} ${added === 1 ? "item" : "items"} from ${collection.title}.`
          : `Added ${added} from ${collection.title}. ${skipped} ${
              skipped === 1 ? "was" : "were"
            } already in this loadout.`
      )
    } catch (thrown) {
      setError(
        `${describe(thrown)} ${added} of ${collection.items.length} ${
          added === 1 ? "item was" : "items were"
        } added before this.`
      )
    } finally {
      setPendingIdentity(null)
    }
  }

  const isLoading = artifacts.isLoading || publicCandidates.isLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[min(46rem,95vw)] max-w-none flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-[var(--ironhub-line)] px-5 py-4 text-left">
          <DialogTitle className="text-base font-medium">
            Add items to this loadout
          </DialogTitle>
          <DialogDescription>
            Your own tools, skills and souls, and verified entries from the
            public catalog. A loadout holds leaves only — one is never a member
            of another.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 border-b border-[var(--ironhub-line)] bg-muted/20 px-5 py-3">
          <InputGroup className="h-10">
            <InputGroupAddon>
              <IconSearch
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or description"
              aria-label="Search candidates"
              className="bg-background/50 text-sm"
            />
          </InputGroup>

          <ButtonGroup className="flex w-full shrink-0">
            {TABS.map((entry) => {
              const isActive = tab === entry.id
              return (
                <Button
                  key={entry.id}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  aria-pressed={isActive}
                  onClick={() => {
                    setTab(entry.id)
                    setCategory("all")
                  }}
                  className="h-9 flex-1 rounded-full px-2 text-xs font-medium"
                >
                  {entry.label}
                </Button>
              )
            })}
          </ButtonGroup>

          {showCandidates && (
            <div className="flex flex-wrap gap-2">
              <NativeSelect
                className="min-w-0 flex-1"
                aria-label="Source"
                value={source}
                onChange={(event) =>
                  setSource(event.target.value as "all" | MemberSource)
                }
              >
                <NativeSelectOption value="all">All sources</NativeSelectOption>
                <NativeSelectOption value="private">
                  Your space
                </NativeSelectOption>
                <NativeSelectOption value="public">
                  Public catalog
                </NativeSelectOption>
              </NativeSelect>

              <NativeSelect
                className="min-w-0 flex-1"
                aria-label="Category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <NativeSelectOption value="all">
                  All categories
                </NativeSelectOption>
                {categories.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {value}
                  </NativeSelectOption>
                ))}
              </NativeSelect>

              <NativeSelect
                className="min-w-0 flex-1"
                aria-label="Sort"
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as "name" | "kind")
                }
              >
                <NativeSelectOption value="name">By name</NativeSelectOption>
                <NativeSelectOption value="kind">By type</NativeSelectOption>
              </NativeSelect>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {(error || collectionResult) && (
            <div
              role={error ? "alert" : "status"}
              className={cn(
                "mb-3 flex items-start gap-2.5 rounded-xl border p-3 text-sm",
                error
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : "border-[var(--ironhub-line)] bg-muted/40 text-muted-foreground"
              )}
            >
              {error && (
                <IconAlertTriangle
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
              )}
              <span>{error ?? collectionResult}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
              <span>Loading what you can add...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {publicCandidates.isError && (
                <p className="rounded-xl border border-[var(--ironhub-line)] bg-muted/40 p-3 text-sm text-muted-foreground">
                  The public catalog could not be read, so only your own items
                  are listed. Public entries resolve live from upstream, so this
                  is an outage rather than a change to your loadout.
                </p>
              )}

              {showCollections &&
                visibleCollections.map((collection) => {
                  const pending = pendingIdentity === `collection:${collection.slug}`
                  return (
                    <div
                      key={collection.slug}
                      className="flex items-start gap-3 rounded-xl border border-[var(--ironhub-line)] bg-card p-4"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <IconBoxMultiple
                          className="size-4"
                          aria-hidden="true"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">
                            {collection.title}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={pending || collection.items.length === 0}
                            onClick={() => void handleAddCollection(collection)}
                            className="h-8 shrink-0 rounded-lg text-xs"
                          >
                            {pending && (
                              <IconLoader2
                                className="size-3.5 animate-spin"
                                aria-hidden="true"
                              />
                            )}
                            <span>{`Add ${collection.items.length} items`}</span>
                          </Button>
                        </div>
                        <p className="mt-1 text-sm leading-snug text-muted-foreground">
                          {collection.summary}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          A collection is a saved search, not a fixed set, so it
                          is added as its individual items. Anything already in
                          this loadout is skipped.
                        </p>
                      </div>
                    </div>
                  )
                })}

              {showCandidates &&
                visibleCandidates.map((candidate) => {
                  const member = byIdentity.get(candidate.identity)
                  const equipped = Boolean(member)
                  const pending = pendingIdentity === candidate.identity
                  const blockedBySoul =
                    candidate.kind === "soul" &&
                    !equipped &&
                    existingSoul !== null
                  const Icon = KIND_ICONS[candidate.kind]

                  return (
                    <div
                      key={candidate.identity}
                      data-testid={`candidate-${candidate.identity}`}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-4 transition-colors",
                        equipped
                          ? "border-primary/40 bg-primary/5"
                          : "border-[var(--ironhub-line)] bg-card hover:bg-muted/30"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg",
                          equipped
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {candidate.title}
                            </p>
                            <p className="truncate font-mono text-xs text-muted-foreground">
                              {candidate.name} · {candidate.version}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant={equipped ? "secondary" : "outline"}
                            size="sm"
                            disabled={pending || blockedBySoul}
                            onClick={() => void handleToggle(candidate)}
                            className="h-8 shrink-0 rounded-lg text-xs"
                          >
                            {pending ? (
                              <IconLoader2
                                className="size-3.5 animate-spin"
                                aria-hidden="true"
                              />
                            ) : equipped ? (
                              <IconCheck
                                className="size-3.5"
                                aria-hidden="true"
                              />
                            ) : (
                              <IconPlus
                                className="size-3.5"
                                aria-hidden="true"
                              />
                            )}
                            <span>
                              {equipped
                                ? `Added ${candidate.title}`
                                : `Add ${candidate.title}`}
                            </span>
                          </Button>
                        </div>

                        {candidate.description && (
                          <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {candidate.description}
                          </p>
                        )}

                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[var(--ironhub-line)] bg-muted/40 px-2.5 text-xs text-muted-foreground">
                            <Icon className="size-3.5" aria-hidden="true" />
                            {KIND_LABELS[candidate.kind]}
                          </span>
                          <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[var(--ironhub-line)] bg-muted/40 px-2.5 text-xs text-muted-foreground">
                            {candidate.source === "private" ? (
                              <IconLock className="size-3.5" aria-hidden="true" />
                            ) : (
                              <IconWorld
                                className="size-3.5"
                                aria-hidden="true"
                              />
                            )}
                            {candidate.source === "private"
                              ? "Your space"
                              : "Public · verified"}
                          </span>
                          {candidate.status ? (
                            <StatusBadge status={candidate.status} />
                          ) : null}
                        </div>

                        {candidate.status === "draft" && !equipped && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            This is a draft. It can be added now, but the
                            loadout cannot be published while it stays one.
                          </p>
                        )}

                        {blockedBySoul && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {`This loadout already has the soul "${existingSoul?.name}". Remove it before adding another.`}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}

              {showCandidates &&
                visibleCandidates.length === 0 &&
                (!showCollections || visibleCollections.length === 0) && (
                  <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                    Nothing matches. Try a different search or filter.
                  </p>
                )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--ironhub-line)] px-5 py-3">
          <p className="text-sm text-muted-foreground">
            {`${members.length} ${members.length === 1 ? "item" : "items"} in this loadout`}
          </p>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-lg"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}


function toInput(candidate: Candidate): AddMemberInput {
  return {
    source: candidate.source,
    kind: candidate.kind,
    name: candidate.name,
    ...(candidate.artifactId ? { artifactId: candidate.artifactId } : {}),
  }
}
