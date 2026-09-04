"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  IconAlertTriangle,
  IconBoxMultiple,
  IconCheck,
  IconExternalLink,
  IconInfoCircle,
  IconLoader2,
  IconLock,
  IconPlus,
  IconRocket,
  IconSparkles,
  IconTool,
  IconUserHeart,
  IconWorld,
  IconX,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  describeArtifactSaveError,
  useArtifact,
  useArtifactChecks,
  usePublishArtifact,
  useUpdateArtifact,
} from "@/features/partner/api/artifacts"
import { ApiError } from "@/features/partner/api/client"
import {
  useLoadoutMembers,
  useRemoveLoadoutMember,
  type MemberKind,
  type MemberStatus,
  type ResolvedMember,
} from "@/features/partner/api/loadouts"
import { CategoryAndRepoFields } from "@/features/partner/components/category-repo-fields"
import { LoadoutMemberPicker } from "@/features/partner/components/loadout-member-picker"
import { SoulInstallDisclosure } from "@/features/partner/components/soul-install-disclosure"
import { EmptyState, FormSection } from "@/features/partner/components/ui"
import { VisibilitySelector } from "@/features/partner/components/visibility-selector"
import { useToast } from "@/features/partner/store/toast-provider"
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

/**
 * How each item status reads, and what colour it is allowed to claim.
 *
 * `drifted` and `updated_upstream` describe the same observation -- the bytes
 * moved since the pin was taken -- and they are deliberately not shown the
 * same way. A private item's own organization changed it, so it blocks
 * installs and is drawn as a fault. A public item's upstream author changed
 * it, which neither the loadout's owner nor its installer can undo, so it is
 * drawn as news (design.md -- "Pin by source", and loadout-member-health spec
 * -- "Drift is detected by digest comparison and acted on by source").
 */
const STATUS_INFO: Record<
  MemberStatus,
  { label: string; tone: "ok" | "warn" | "fail"; blurb: string }
> = {
  ok: {
    label: "Resolved",
    tone: "ok",
    blurb: "Resolves and matches the version and digest pinned at publish.",
  },
  draft: {
    label: "Draft",
    tone: "warn",
    blurb:
      "This item is still a draft. The loadout cannot be published while it is.",
  },
  visibility_too_narrow: {
    label: "Private item",
    tone: "warn",
    blurb:
      "Publishing the loadout at this visibility would serve this item to people it was never shared with.",
  },
  missing: {
    label: "No longer available",
    tone: "fail",
    blurb:
      "This item cannot be resolved from its source. Installs are refused rather than served without it.",
  },
  unreachable: {
    label: "Source unreachable",
    tone: "fail",
    blurb:
      "The source could not be reached. This is an outage, not a removal — the item may come back on its own.",
  },
  drifted: {
    label: "Drifted — blocks installs",
    tone: "fail",
    blurb:
      "This item's content has been replaced since the loadout was published. Installs are refused until then, but publishing is not: publish again to re-pin this item and restore them.",
  },
  updated_upstream: {
    label: "Updated upstream — installs continue",
    tone: "warn",
    blurb:
      "The public author released new bytes. Installs are still served, with the item's current content. Publish again to record what is being served now.",
  },
}

const TONE_CLASSES: Record<"ok" | "warn" | "fail", string> = {
  ok: "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400",
  warn: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-400",
  fail: "border-destructive/30 bg-destructive/10 text-destructive",
}

/** The two statuses that mean "what resolves now is not what was pinned". */
function hasMoved(item: ResolvedMember) {
  return item.status === "drifted" || item.status === "updated_upstream"
}

/**
 * The private artifact id behind an item, read off the link the resolver
 * computed for it.
 *
 * `SoulInstallDisclosure` reads a soul by artifact id, and a resolved item
 * carries a link rather than an id. Taking the id from the link keeps the
 * resolver as the one place that decides what an item points at -- the
 * alternative, matching the item's name against the organization's artifact
 * list, is the guess `href` exists to remove.
 */
function privateArtifactId(item: ResolvedMember): string | null {
  if (item.source !== "private" || !item.href) return null
  return /^\/dashboard\/manage\/([^/?#]+)$/.exec(item.href)?.[1] ?? null
}

export interface LoadoutEditorProps {
  id: string
}

/**
 * One item of a loadout, as a row inside its kind's card.
 *
 * The name is a link to the item's own page, because name and version do not
 * answer what an item actually is. A public item opens in a new tab -- it
 * leaves the workspace -- and an item that no longer resolves has no page to
 * point at, so it is plain text (design.md -- "Every item links to its own
 * page").
 */
function LoadoutItemRow({
  item,
  onRemove,
  isRemoving,
}: {
  item: ResolvedMember
  onRemove: () => void
  isRemoving: boolean
}) {
  const info = STATUS_INFO[item.status]
  const Icon = KIND_ICONS[item.kind]
  const version = item.currentVersion ?? item.pinnedVersion ?? "no version"

  const name = <span className="truncate">{item.name}</span>
  const nameClasses =
    "min-w-0 truncate text-sm font-medium text-foreground hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-sm"

  return (
    <li
      data-testid={`item-${item.memberId}`}
      className="flex items-start gap-3 rounded-xl border border-[var(--ironhub-line)] bg-background/50 p-3.5 transition-colors hover:border-primary/30 hover:bg-background/80"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {item.href === null ? (
              <span className="min-w-0 truncate text-sm font-medium text-foreground">
                {item.name}
              </span>
            ) : item.source === "public" ? (
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className={cn(nameClasses, "inline-flex items-center gap-1")}
              >
                {name}
                <IconExternalLink
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              <Link href={item.href} className={nameClasses}>
                {name}
              </Link>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isRemoving}
            onClick={onRemove}
            aria-label={`Remove ${item.name}`}
            className="size-8 shrink-0 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            {isRemoving ? (
              <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <IconX className="size-4" aria-hidden="true" />
            )}
          </Button>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs text-muted-foreground">
            {version}
          </span>
          <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[var(--ironhub-line)] bg-muted/40 px-2.5 text-xs text-muted-foreground">
            {item.source === "private" ? (
              <IconLock className="size-3.5" aria-hidden="true" />
            ) : (
              <IconWorld className="size-3.5" aria-hidden="true" />
            )}
            {item.source === "private" ? "Your space" : "Public · verified"}
          </span>
          <span
            className={cn(
              "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium",
              TONE_CLASSES[info.tone]
            )}
          >
            {info.tone === "ok" && (
              <IconCheck className="size-3.5" aria-hidden="true" />
            )}
            {info.label}
          </span>
          {item.blocksInstall && (
            <span className="inline-flex h-6 items-center rounded-full border border-destructive/30 bg-destructive/10 px-2.5 text-xs font-medium text-destructive">
              Blocks installs
            </span>
          )}
          {item.status === "updated_upstream" && (
            <span className="inline-flex h-6 items-center rounded-full border border-[var(--ironhub-line)] bg-muted/40 px-2.5 text-xs text-muted-foreground">
              Installs continue
            </span>
          )}
        </div>

        {item.status !== "ok" && (
          <p className="mt-2 text-sm leading-snug text-muted-foreground">
            {item.reason ?? info.blurb}
          </p>
        )}
      </div>
    </li>
  )
}

/**
 * One kind's card: its own heading, its own add control, its own items.
 *
 * A loadout is read as "who is this agent, and what can it do", and one flat
 * list flattens exactly the distinction its owner is composing along -- so the
 * soul, the skills and the tools each get a card, and each add control opens
 * the picker already on the kind it was asked for (design.md -- "One section
 * per kind, not one list of everything").
 */
function LoadoutKindSection({
  kind,
  title,
  description,
  emptyPrompt,
  items,
  canAdd,
  addLabel,
  onAdd,
  onRemove,
  removingId,
  footer,
}: {
  kind: MemberKind
  title: string
  description: string
  emptyPrompt: string
  items: ResolvedMember[]
  canAdd: boolean
  addLabel: string
  onAdd: () => void
  onRemove: (item: ResolvedMember) => void
  removingId: string | null
  footer?: React.ReactNode
}) {
  const Icon = KIND_ICONS[kind]

  return (
    <FormSection
      title={title}
      description={description}
      action={
        canAdd && items.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAdd}
            className="h-9 w-full rounded-full border-primary/30 px-3.5 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground sm:w-auto"
          >
            <IconPlus className="size-3.5" aria-hidden="true" />
            <span>{addLabel}</span>
          </Button>
        ) : undefined
      }
    >
      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <LoadoutItemRow
              key={item.memberId}
              item={item}
              isRemoving={removingId === item.memberId}
              onRemove={() => onRemove(item)}
            />
          ))}
        </ul>
      ) : canAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--ironhub-line)] bg-background/20 px-4 py-9 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-background/50 hover:text-primary"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium text-foreground">
            {addLabel}
          </span>
          <span className="max-w-xs text-center text-xs leading-relaxed text-muted-foreground">
            {emptyPrompt}
          </span>
        </button>
      ) : null}
      {footer}
    </FormSection>
  )
}

/**
 * A loadout's editable record and its items.
 *
 * A loadout is an artifact type, so it follows the same path every other type
 * follows -- a type card in `new-submit`, and this editor beside `SoulEditor`,
 * `ToolEditor` and `SkillEditor` on the manage screen.
 *
 * What is different from the other editors is that this one is not a form
 * filled top to bottom. It has no numbered steps, because composing a loadout
 * is not a sequence: an owner moves between the soul and the tools and back
 * (design.md -- "One section per kind"). Its two commit actions therefore sit
 * in a bar pinned to the foot of the editor rather than in the page header,
 * next to the sections whose state they commit.
 */
export function LoadoutEditor({ id }: LoadoutEditorProps) {
  const { notify } = useToast()
  const { data: artifact, isLoading, isError } = useArtifact(id)
  const updateArtifact = useUpdateArtifact(id)
  const publishArtifact = usePublishArtifact(id)
  const checks = useArtifactChecks(id)
  const itemsQuery = useLoadoutMembers(id)
  const removeItem = useRemoveLoadoutMember(id)

  const [title, setTitle] = useState("")
  const [version, setVersion] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [visibility, setVisibility] = useState<"public" | "private">("private")
  const [formError, setFormError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [versionError, setVersionError] = useState<string | null>(null)

  const [pickerTab, setPickerTab] = useState<
    "all" | MemberKind | "collection"
  >("all")
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [itemError, setItemError] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Guard so a background refetch never clobbers an in-progress edit -- the
  // same rule the other editors follow.
  const seededArtifactIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (artifact && seededArtifactIdRef.current !== artifact.id) {
      seededArtifactIdRef.current = artifact.id
      setTitle(artifact.title)
      setVersion(artifact.version)
      setDescription(artifact.description ?? "")
      setCategory(artifact.category ?? "")
      setVisibility(artifact.visibility)
    }
  }, [artifact])

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data])
  const soulItems = items.filter((item) => item.kind === "soul")
  const skillItems = items.filter((item) => item.kind === "skill")
  const toolItems = items.filter((item) => item.kind === "tool")

  const failing = items.filter((item) => item.status !== "ok")
  const installBlockers = items.filter((item) => item.blocksInstall)
  const moved = items.filter(hasMoved)

  const soulItem = soulItems[0] ?? null
  const soulArtifactId = soulItem ? privateArtifactId(soulItem) : null

  const openPicker = (tab: "all" | MemberKind | "collection") => {
    setItemError(null)
    setPickerTab(tab)
    setIsPickerOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--ironhub-line)] bg-card px-6 py-16 text-center text-sm text-muted-foreground shadow-[var(--ironhub-shadow)]">
        <div className="flex items-center justify-center gap-2">
          <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
          <span>Loading this loadout...</span>
        </div>
        <p>Fetching the details and resolving its items.</p>
      </div>
    )
  }

  if (isError || !artifact || artifact.type !== "loadout") {
    return (
      <EmptyState
        icon={IconAlertTriangle}
        title="Loadout not found"
        description="This item does not exist, or it is not a loadout."
        action={
          <Button asChild variant="default" className="h-11 rounded-lg sm:h-10">
            <Link href="/dashboard/catalog">Back to catalog</Link>
          </Button>
        }
      />
    )
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setCategoryError(null)
    setVersionError(null)

    try {
      await updateArtifact.mutateAsync({
        title,
        description,
        category: category || null,
        visibility,
        ...(version !== artifact.version ? { version } : {}),
      })
      notify(`Changes saved for ${title}`)
    } catch (error) {
      const described = describeArtifactSaveError(error)
      if (described.field === "category") setCategoryError(described.message)
      else if (described.field === "version") setVersionError(described.message)
      else setFormError(described.message)
    }
  }

  const handlePublish = async () => {
    setPublishError(null)
    try {
      await publishArtifact.mutateAsync()
      notify(
        artifact.status === "published"
          ? `${artifact.title} published again — every item re-pinned`
          : `${artifact.title} published`
      )
    } catch (error) {
      // The publish gate names every failing item and its reason; show that
      // sentence rather than a generic one.
      setPublishError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to publish this loadout."
      )
    }
  }

  const handleRemoveItem = async (item: ResolvedMember) => {
    setItemError(null)
    setRemovingId(item.memberId)
    try {
      await removeItem.mutateAsync(item.memberId)
      notify(`${item.name} removed from ${artifact.title}`, "info")
    } catch (error) {
      setItemError(
        error instanceof Error ? error.message : "Failed to remove that item."
      )
    } finally {
      setRemovingId(null)
    }
  }

  const formId = "loadout-record-form"
  const isSaving = updateArtifact.isPending
  const isPublishBlocked = Boolean(
    checks.data && !checks.isError && !checks.data.publishable
  )

  return (
    <div className="flex flex-col gap-6">
      {formError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <IconAlertTriangle className="mt-0.5 size-5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form id={formId} onSubmit={handleSave} className="flex flex-col gap-6">
        <FormSection
          title="Basics"
          description="The name, version and one-line summary people see."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="loadout-title"
                className="text-sm font-medium text-foreground"
              >
                Name
              </label>
              <Input
                id="loadout-title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 rounded-lg sm:h-10"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="loadout-version"
                className="text-sm font-medium text-foreground"
              >
                Version
              </label>
              <Input
                id="loadout-version"
                required
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                aria-invalid={versionError ? true : undefined}
                className="h-11 rounded-lg sm:h-10"
              />
              {versionError ? (
                <p className="text-sm font-medium text-destructive">
                  {versionError}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Give every release its own version. It can only move forward.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="loadout-description"
              className="text-sm font-medium text-foreground"
            >
              Short description
            </label>
            <Input
              id="loadout-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="One line describing what this loadout is for."
              className="h-11 rounded-lg sm:h-10"
            />
          </div>

          {/* No repository link: a loadout is composed in the hub out of items
              that each carry their own, so a link here would duplicate one or
              point at nothing (design.md -- "A loadout has no source
              repository"). */}
          <CategoryAndRepoFields
            includeSourceUrl={false}
            category={category}
            onCategoryChange={setCategory}
            categoryError={categoryError}
          />
        </FormSection>

        <FormSection
          title="Who can see it"
          description="Private stays inside this workspace."
        >
          <VisibilitySelector visibility={visibility} onChange={setVisibility} />
          <p className="mt-3 text-sm leading-snug text-muted-foreground">
            A loadout cannot be published more widely than its items. If an item
            is private and this loadout is not, publishing is refused naming
            that item — otherwise publishing would serve private content to
            people outside this workspace.
          </p>
        </FormSection>
      </form>

      {itemError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <IconAlertTriangle className="mt-0.5 size-5 shrink-0" />
          <span>{itemError}</span>
        </div>
      )}

      {itemsQuery.isError && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive sm:flex-row sm:items-center">
          <div className="flex items-start gap-2.5">
            <IconAlertTriangle className="mt-0.5 size-5 shrink-0" />
            <span>
              This loadout&apos;s items could not be read, so their health is
              unknown. Nothing has changed about the loadout itself.
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void itemsQuery.refetch()}
            className="h-10 shrink-0 self-start rounded-lg px-3 text-sm sm:self-center"
          >
            Retry
          </Button>
        </div>
      )}

      {/* The roll-call names every failing item rather than only the first,
          because a publish refusal names them all and an owner who fixes one
          at a time learns that the hard way. */}
      {failing.length > 0 && (
        <div
          role="status"
          className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm"
        >
          <div className="flex items-start gap-2.5">
            <IconAlertTriangle
              className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <div>
              <p className="font-medium text-foreground">
                {`${failing.length} of ${items.length} ${items.length === 1 ? "item needs" : "items need"
                  } attention`}
              </p>
              <ul className="mt-1.5 flex flex-col gap-1 text-muted-foreground">
                {failing.map((item) => (
                  <li key={item.memberId}>
                    <span className="font-medium text-foreground">
                      {item.name}
                    </span>
                    {` — ${item.reason ?? STATUS_INFO[item.status].blurb}`}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-muted-foreground">
            {installBlockers.length > 0
              ? `Installs of this loadout are refused while ${installBlockers
                .map((item) => item.name)
                .join(", ")} ${installBlockers.length === 1 ? "is" : "are"
              } in this state. A loadout is never served with only its healthy items.`
              : "None of this blocks an install. A loadout is served whole or not at all, and every item above still resolves."}
          </p>
          {/* Re-pinning is not a separate action: publishing is what records
              every item's version and digest. Drift is deliberately not a
              publish blocker -- publishing is the only thing that repairs it,
              so the condition publishing fixes cannot also forbid publishing
              (design.md -- "Re-pinning is what publishing already does"). The
              wording has to carry that, or an owner reads a dead end. */}
          {moved.length > 0 && (
            <p className="text-muted-foreground">
              Publishing is available — it is what re-pins. Publish this loadout
              again to record what resolves now.
            </p>
          )}
        </div>
      )}

      {itemsQuery.isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--ironhub-line)] bg-muted/40 p-4 text-sm text-muted-foreground">
          <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
          <span>Resolving items...</span>
        </div>
      ) : (
        <>
          <LoadoutKindSection
            kind="soul"
            title="Soul"
            description="Who this agent is. A loadout holds at most one."
            emptyPrompt="Pick the persona this agent reads before anything else."
            addLabel="Choose a soul"
            items={soulItems}
            canAdd={soulItems.length === 0}
            onAdd={() => openPicker("soul")}
            onRemove={(item) => void handleRemoveItem(item)}
            removingId={removingId}
            footer={
              soulItem ? (
                <p className="text-xs text-muted-foreground">
                  A loadout holds at most one soul. Remove this one to choose a
                  different persona.
                </p>
              ) : undefined
            }
          />

          <LoadoutKindSection
            kind="skill"
            title="Skills"
            description="Written instructions this agent can follow."
            emptyPrompt="Add the instructions this agent should be able to follow."
            addLabel="Add skills"
            items={skillItems}
            canAdd
            onAdd={() => openPicker("skill")}
            onRemove={(item) => void handleRemoveItem(item)}
            removingId={removingId}
          />

          <LoadoutKindSection
            kind="tool"
            title="Tools"
            description="Packaged programs this agent can run."
            emptyPrompt="Add the programs this agent should be able to run."
            addLabel="Add tools"
            items={toolItems}
            canAdd
            onAdd={() => openPicker("tool")}
            onRemove={(item) => void handleRemoveItem(item)}
            removingId={removingId}
            footer={
              /* Collections are an action, never a section. A bundle is a live
                 keyword query with no fixed membership, so there is nothing to
                 pin and nothing to display as held -- selecting one adds its
                 entries to the cards above (design.md -- "Collections are an
                 action, never a section"). */
              <div className="flex flex-col gap-2 border-t border-[var(--ironhub-line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  A collection is a saved search, not a fixed set. Adding one
                  puts its entries into the sections above.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => openPicker("collection")}
                  className="h-9 shrink-0 rounded-full px-3.5 text-xs font-medium"
                >
                  <IconBoxMultiple className="size-3.5" aria-hidden="true" />
                  <span>Add from a collection</span>
                </Button>
              </div>
            }
          />
        </>
      )}

      {/* Install disclosure. A loadout holds at most one soul, so honouring the
          full-text disclosure the soul spec requires costs exactly one document
          and reuses SoulInstallDisclosure unchanged. Everything else is listed
          by kind, name and version (design.md -- "Install disclosure shows the
          soul in full and summarises the rest"). */}
      <FormSection
        title="Install to your agent"
        description="What this loadout would add, and why it cannot be sent yet."
      >
        {/* Never a mock success. The hub can compose, pin and verify a loadout;
            what it cannot do is deliver one, because the agent takes a
            single-entry install payload and a loadout is many entries. */}
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm"
        >
          <IconAlertTriangle
            className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium text-foreground">
              Installing a loadout is not available yet
            </p>
            <p className="mt-1 text-muted-foreground">
              {/* Your agent accepts an install payload carrying one artifact, and a
              loadout is many. A partial loadout is never served, so there is
              nothing to send until the agent supports a multi-entry payload.
              Everything below is what would be installed once it does. */}
              Waiting Ironclaw to support it.
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This loadout has no items, so it would install nothing.
          </p>
        ) : (
          <>
            {soulItem &&
              (soulArtifactId ? (
                <SoulInstallDisclosure artifactId={soulArtifactId}>
                  <div className="flex items-start gap-2.5 rounded-lg border border-[var(--ironhub-line)] bg-muted/40 p-3 text-sm text-muted-foreground">
                    <IconInfoCircle className="mt-0.5 size-4 shrink-0" />
                    <span>
                      Nothing is installed by reading this. Installing a loadout
                      is still unavailable — see above.
                    </span>
                  </div>
                </SoulInstallDisclosure>
              ) : (
                <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  <IconAlertTriangle className="mt-0.5 size-5 shrink-0" />
                  <span>
                    {`The soul "${soulItem.name}" could not be read, so its full text cannot be shown here. A soul is never installed without its text being disclosed first.`}
                  </span>
                </div>
              ))}

            <div>
              <p className="text-sm font-medium text-foreground">
                {soulItem
                  ? "Everything else this loadout installs"
                  : "Everything this loadout installs"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Each of these runs sandboxed by the agent, so it is listed by
                kind, name and version rather than in full.
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {[...skillItems, ...toolItems].map((item) => {
                  const Icon = KIND_ICONS[item.kind]
                  return (
                    <li
                      key={item.memberId}
                      className="flex items-center gap-2.5 rounded-lg border border-[var(--ironhub-line)] bg-muted/30 px-3 py-2 text-sm"
                    >
                      <Icon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">
                        {KIND_LABELS[item.kind]}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                        {item.name}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {item.currentVersion ?? item.pinnedVersion ?? "no version"}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {skillItems.length + toolItems.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  This loadout holds only a soul.
                </p>
              )}
            </div>
          </>
        )}
      </FormSection>

      {/* The two commit actions, pinned to the foot of the editor rather than
          scattered between the page header and mid-page. They stay distinct:
          keeping a draft without publishing is a normal thing to do here
          (design.md -- "Actions sit at the foot of the editor"). */}
      <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-xl border border-[var(--ironhub-line)] bg-card p-4 shadow-lg">
        {publishError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{publishError}</span>
          </div>
        )}
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            id="loadout-publish-hint"
            className="text-sm text-muted-foreground"
          >
            {isPublishBlocked
              ? "Some checks below are not passing yet."
              : artifact.status === "published"
                ? "Publishing again re-records every item's version and digest."
                : "Save keeps this a draft. Publish records every item's version and digest."}
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button
              type="submit"
              form={formId}
              variant="outline"
              disabled={isSaving}
              className="h-11 rounded-lg px-5 sm:h-10"
            >
              {isSaving && (
                <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
              )}
              <span>Save changes</span>
            </Button>
            <Button
              type="button"
              onClick={() => void handlePublish()}
              disabled={
                publishArtifact.isPending ||
                checks.isLoading ||
                checks.isError ||
                !checks.data?.publishable
              }
              aria-describedby="loadout-publish-hint"
              className="h-11 rounded-lg px-5 sm:h-10"
            >
              {publishArtifact.isPending ? (
                <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <IconRocket className="size-4" aria-hidden="true" />
              )}
              <span>
                {artifact.status === "published" ? "Publish update" : "Publish"}
              </span>
            </Button>
          </div>
        </div>
      </div>

      <LoadoutMemberPicker
        loadoutId={id}
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        members={items}
        initialTab={pickerTab}
      />
    </div>
  )
}
