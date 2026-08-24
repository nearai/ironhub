"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBook,
  IconCategory,
  IconCheck,
  IconCopy,
  IconDotsVertical,
  IconDownload,
  IconInfoCircle,
  IconLink,
  IconLoader2,
  IconLock,
  IconRocket,
  IconRocketOff,
  IconTool,
  IconTrash,
  IconWorld,
  IconX,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  type ContentKind,
  useArtifact,
  useArtifactChecks,
  useDeleteArtifact,
  useMintInstallToken,
  usePublishArtifact,
  useUnpublishArtifact,
} from "@/features/partner/api/artifacts"
import { ApiError } from "@/features/partner/api/client"
import { SkillEditor } from "@/features/partner/components/skill-editor"
import { ToolEditor } from "@/features/partner/components/tool-editor"
import { AttributeBadge } from "@/features/partner/components/ui/attribute-badge"
import { EmptyState } from "@/features/partner/components/ui/empty-state"
import { FormSection } from "@/features/partner/components/ui/form-section"
import { RelativeTime } from "@/features/partner/components/ui/relative-time"
import { StatusBadge } from "@/features/partner/components/ui/status-badge"
import { workspaceLinkTone } from "@/features/partner/components/ui/tone"
import { WorkspacePageHeader } from "@/features/partner/components/ui/workspace-page-header"
import { useToast } from "@/features/partner/store/toast-provider"
import { cn } from "@/lib/shared/utils"

interface PageProps {
  params: Promise<{ submissionId: string }>
}

// Only the kinds the Files section still renders, which is a skill's single
// instructions file: a tool's stored files all come out of one uploaded
// archive and are shown as that archive's contents in the tool editor's
// Package step, so listing them again as separate managed files made three
// cards out of one thing.
const CONTENT_KIND_INFO: Partial<
  Record<ContentKind, { name: string; blurb: string }>
> = {
  skill_md: {
    name: "Instructions file (SKILL.md)",
    blurb: "The written instructions the assistant follows.",
  },
}

function formatFileSize(bytes: number): string {
  if (bytes === 1) return "1 byte"
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ManageSubmissionPage({ params }: PageProps) {
  const { submissionId } = use(params)
  const router = useRouter()
  const { notify } = useToast()
  const { data: artifact, isLoading, isError } = useArtifact(submissionId)
  const checks = useArtifactChecks(submissionId)
  const deleteArtifact = useDeleteArtifact()
  const mintToken = useMintInstallToken(submissionId)
  const publishArtifact = usePublishArtifact(submissionId)
  const unpublishArtifact = useUnpublishArtifact(submissionId)

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [copiedInstall, setCopiedInstall] = useState(false)
  // The minted link is kept on the page rather than only on the clipboard:
  // `navigator.clipboard.writeText` rejects whenever the document isn't
  // focused (devtools open, another window in front) and in insecure
  // contexts, and a link the author can select by hand is the only fallback
  // that always works.
  const [installUrl, setInstallUrl] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Loading item...
      </div>
    )
  }

  if (isError || !artifact) {
    return (
      <div className="py-16">
        <EmptyState
          title="We couldn't find that item"
          description="The item you're looking for doesn't exist or you don't have access to it."
          action={
            <Button asChild className="h-10 rounded-lg">
              <Link href="/dashboard/catalog">Back to your catalog</Link>
            </Button>
          }
        />
      </div>
    )
  }

  // Mirrors service.ts's REQUIRED_CONTENT_KINDS_BY_TYPE (design.md D3):
  // manifest.toml is now the authoritative metadata carrier for a tool, so
  // it -- not capabilities -- is what gates completeness here. Left out of
  // sync with the server table, this local gate would silently disagree
  // with the `content_complete` check the checks panel renders below it.
  const expectedKinds: ContentKind[] =
    artifact.type === "tool" ? ["wasm", "manifest_toml"] : ["skill_md"]
  const uploadedKinds = new Set(artifact.content.map((c) => c.kind))
  const isContentComplete = expectedKinds.every((kind) =>
    uploadedKinds.has(kind)
  )
  const displayKinds = expectedKinds.filter((kind) => kind in CONTENT_KIND_INFO)
  const isSingleCard = displayKinds.length === 1

  // `?download=1` makes the content route answer with a Content-Disposition
  // naming the file; without it the same URL streams inline, which is what
  // the editors below read.
  const downloadHref = (kind: ContentKind) =>
    `/api/private-artifacts/${artifact.id}/content/${kind}?download=1`

  // design D6: state picks the primary action -- Publish while draft, Copy
  // install link once published -- and the disabled-publish reason (D7)
  // renders once, next to that action, instead of also at the bottom of the
  // Publishing section.
  const isPublishBlocked = Boolean(
    checks.data && !checks.isError && !checks.data.publishable
  )

  // The one file a member is most likely to want a copy of: the package they
  // uploaded for a tool, the instructions file for a skill. Only offered when
  // it is actually stored.
  const primaryDownloadKind: ContentKind | null =
    artifact.type === "tool"
      ? uploadedKinds.has("bundle_zip")
        ? "bundle_zip"
        : uploadedKinds.has("wasm")
          ? "wasm"
          : null
      : uploadedKinds.has("skill_md")
        ? "skill_md"
        : null
  const primaryDownload = primaryDownloadKind
    ? {
        kind: primaryDownloadKind,
        label:
          primaryDownloadKind === "bundle_zip"
            ? "Download package"
            : primaryDownloadKind === "wasm"
              ? "Download program"
              : "Download skill",
      }
    : null

  const copyToClipboard = async (value: string) => {
    if (!navigator.clipboard?.writeText) return false
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      return false
    }
  }

  const handleCopyInstall = async () => {
    let manifestUrl: string
    try {
      ;({ manifestUrl } = await mintToken.mutateAsync())
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Failed to copy install link",
        "error"
      )
      return
    }

    // Always reveal the link, then try the clipboard: a failed copy is a
    // browser condition the author can work around by selecting the link,
    // not a failure of minting it.
    setInstallUrl(manifestUrl)
    if (await copyToClipboard(manifestUrl)) {
      setCopiedInstall(true)
      setTimeout(() => setCopiedInstall(false), 2000)
      notify("Install link copied")
    } else {
      notify("Install link ready -- copy it from the box below", "info")
    }
  }

  const handleCopyInstallUrlAgain = async () => {
    if (!installUrl) return
    if (await copyToClipboard(installUrl)) {
      setCopiedInstall(true)
      setTimeout(() => setCopiedInstall(false), 2000)
      notify("Install link copied")
    } else {
      notify("Copying is blocked here -- select the link and copy it", "info")
    }
  }

  const handleDelete = async () => {
    try {
      await deleteArtifact.mutateAsync(artifact.id)
      setIsDeleteOpen(false)
      notify(`${artifact.title} deleted`, "info")
      router.push("/dashboard/catalog")
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Failed to delete item",
        "error"
      )
    }
  }

  const handlePublish = async () => {
    setPublishError(null)
    try {
      await publishArtifact.mutateAsync()
      notify(`${artifact.title} published`)
    } catch (error) {
      // Surface the server's precondition reason (e.g. missing category,
      // incomplete content) verbatim rather than a generic message.
      setPublishError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to publish item."
      )
    }
  }

  const handleUnpublish = async () => {
    setPublishError(null)
    try {
      await unpublishArtifact.mutateAsync()
      notify(`${artifact.title} moved back to draft`, "info")
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Failed to unpublish item.",
        "error"
      )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header */}
      <WorkspacePageHeader
        backHref="/dashboard/catalog"
        backLabel="Back to your catalog"
        title={artifact.title}
        description={artifact.description ?? undefined}
        action={
          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:items-end">
            {/* design D6: one primary action, chosen by the item's state --
                Publish while it is a draft, Copy install link once it is
                published -- sharing one row with the overflow menu at every
                width, so neither control is ever orphaned onto its own
                line. The reason (below) is a sibling of this row, not a
                cross-axis-stretched column-mate of the button, so it can
                never dictate the button's width. sm:items-end right-aligns
                both the row and the reason paragraph to whichever is wider,
                so their right edges always coincide instead of the reason's
                max-w-xs cap silently stretching the container past the
                row's natural width. */}
            <div className="flex w-full items-start gap-2 sm:w-auto">
              <div className="flex-1 sm:flex-none">
                {artifact.status === "published" ? (
                  <Button
                    type="button"
                    onClick={handleCopyInstall}
                    disabled={mintToken.isPending || !isContentComplete}
                    aria-describedby={
                      isContentComplete ? undefined : "install-blocked-reason"
                    }
                    className="h-10 w-full rounded-lg sm:w-auto"
                  >
                    {mintToken.isPending ? (
                      <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : copiedInstall ? (
                      <IconCheck className="size-4" aria-hidden="true" />
                    ) : (
                      <IconLink className="size-4" aria-hidden="true" />
                    )}
                    <span>{copiedInstall ? "Link copied" : "Copy install link"}</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handlePublish}
                    disabled={
                      publishArtifact.isPending ||
                      checks.isLoading ||
                      checks.isError ||
                      !checks.data?.publishable
                    }
                    aria-describedby={
                      isPublishBlocked ? "publish-blocked-reason" : undefined
                    }
                    className="h-10 w-full rounded-lg sm:w-auto"
                  >
                    {publishArtifact.isPending ? (
                      <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <IconRocket className="size-4" aria-hidden="true" />
                    )}
                    <span>Publish</span>
                  </Button>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10 shrink-0 rounded-lg"
                    aria-label={`More actions for ${artifact.title}`}
                  >
                    <IconDotsVertical className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {artifact.status === "draft" && (
                    <DropdownMenuItem
                      onSelect={() => {
                        void handleCopyInstall()
                      }}
                      disabled={mintToken.isPending || !isContentComplete}
                      title={
                        isContentComplete
                          ? undefined
                          : "Add the required files before you can copy an install link."
                      }
                    >
                      <IconLink aria-hidden="true" />
                      <span>Copy install link</span>
                    </DropdownMenuItem>
                  )}
                  {primaryDownload && (
                    <DropdownMenuItem asChild>
                      <a href={downloadHref(primaryDownload.kind)}>
                        <IconDownload aria-hidden="true" />
                        <span>{primaryDownload.label}</span>
                      </a>
                    </DropdownMenuItem>
                  )}
                  {artifact.status === "published" && (
                    <DropdownMenuItem
                      onSelect={() => {
                        void handleUnpublish()
                      }}
                      disabled={unpublishArtifact.isPending}
                    >
                      <IconRocketOff aria-hidden="true" />
                      <span>Unpublish</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setIsDeleteOpen(true)}
                  >
                    <IconTrash aria-hidden="true" />
                    <span>Delete item</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* design D6/D7: the reason lives directly beneath the
                primary+overflow row -- never between them, and never wide
                enough to stretch the button above it. */}
            {isPublishBlocked && artifact.status !== "published" && (
              <p
                id="publish-blocked-reason"
                className="max-w-xs text-sm text-muted-foreground"
              >
                Resolve the failing checks below before publishing.
              </p>
            )}

            {/* Trigger moved into the overflow menu above (design D6); the
                confirmation step itself is unchanged. */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
              <DialogContent className="max-w-sm rounded-xl">
                <DialogHeader>
                  <DialogTitle>Delete {artifact.title}?</DialogTitle>
                  <DialogDescription>
                    This permanently removes the item from your private space.
                    Members will lose access to run it.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-2 flex flex-row gap-2">
                  <DialogClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 flex-1 rounded-lg"
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteArtifact.isPending}
                    className="h-10 flex-1 rounded-lg"
                  >
                    {deleteArtifact.isPending ? (
                      <IconLoader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <IconTrash className="size-4" aria-hidden="true" />
                    )}
                    <span>Delete item</span>
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {/* What this item *is* leads the row: every other badge qualifies
              it, and a tool and a skill are managed differently enough that
              the reader should not have to infer the type from the sections
              further down. */}
          <AttributeBadge icon={artifact.type === "tool" ? IconTool : IconBook}>
            {artifact.type === "tool" ? "Tool" : "Skill"}
          </AttributeBadge>
          <StatusBadge status={artifact.status} />
          <AttributeBadge
            icon={artifact.visibility === "private" ? IconLock : IconWorld}
          >
            {artifact.visibility === "private" ? "Private" : "In review"}
          </AttributeBadge>
          {artifact.category && (
            <AttributeBadge icon={IconCategory}>
              {artifact.category}
            </AttributeBadge>
          )}
          <AttributeBadge>Version {artifact.version}</AttributeBadge>
          {artifact.sourceUrl && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-10 rounded-lg text-muted-foreground hover:text-foreground sm:h-8"
            >
              <a href={artifact.sourceUrl} target="_blank" rel="noreferrer">
                <IconLink className="size-4" aria-hidden="true" />
                <span>Repository</span>
              </a>
            </Button>
          )}
        </div>
        {!isContentComplete && (
          <p
            id="install-blocked-reason"
            className="text-sm text-muted-foreground"
          >
            Add the required files before you can copy an install link.
          </p>
        )}
      </WorkspacePageHeader>

      {/* The minted install link, shown in full so it can always be copied
          by hand -- see `installUrl` above. */}
      {installUrl && (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--ironhub-line)] bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                Install link
              </p>
              <p className="text-xs text-muted-foreground">
                Paste this into the agent to install {artifact.title}.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-lg"
              aria-label="Dismiss install link"
              onClick={() => setInstallUrl(null)}
            >
              <IconX className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              readOnly
              value={installUrl}
              aria-label="Install link"
              onFocus={(e) => e.currentTarget.select()}
              className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--ironhub-line)] bg-background/50 px-3 font-mono text-xs text-foreground"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyInstallUrlAgain}
              className="h-10 shrink-0 rounded-lg"
            >
              {copiedInstall ? (
                <IconCheck className="size-4" aria-hidden="true" />
              ) : (
                <IconCopy className="size-4" aria-hidden="true" />
              )}
              <span>{copiedInstall ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* 2. Details -- the editable record, on the same page as everything
          else about this item rather than behind a separate edit route. */}
      <div id="item-details">
        {artifact.type === "skill" ? (
          <SkillEditor id={artifact.id} />
        ) : (
          <ToolEditor id={artifact.id} />
        )}
      </div>

      {/* 3. Files -- a skill's one instructions file. A tool's package
          is managed in its own step above, where the archive that
          produced every stored file is also the thing you replace. */}
      {artifact.type === "skill" && (
        <FormSection
          title="Files"
          description="What's stored for this item right now."
        >
          <div
            className={cn(
              "grid gap-3",
              isSingleCard ? "grid-cols-1" : "sm:grid-cols-2"
            )}
          >
            {displayKinds.map((kind) => {
              const uploaded = uploadedKinds.has(kind)
              const content = artifact.content.find((c) => c.kind === kind)
              const info = CONTENT_KIND_INFO[kind] ?? {
                name: kind,
                blurb: "",
              }

              return (
                <div
                  key={kind}
                  className="flex flex-col justify-between rounded-xl border border-[var(--ironhub-line)] bg-card p-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                        <span className="truncate">{info.name}</span>
                        {/* Radix's Tooltip opens on hover/focus only -- it never
                            opens on a touch tap (verified in
                            @radix-ui/react-tooltip: onPointerMove bails out for
                            `pointerType === "touch"`, and onPointerDown/onClick
                            actively close it) -- so below `sm` the blurb is
                            plain visible text instead, same as it always was,
                            and this icon trigger is hidden there entirely. */}
                        {info.blurb && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="hidden size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground sm:inline-flex"
                                aria-label={`About ${info.name}`}
                              >
                                <IconInfoCircle
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{info.blurb}</TooltipContent>
                          </Tooltip>
                        )}
                      </span>
                      {uploaded ? (
                        <AttributeBadge>Stored</AttributeBadge>
                      ) : (
                        <AttributeBadge className="border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-400">
                          Not added yet
                        </AttributeBadge>
                      )}
                    </div>
                    {info.blurb && (
                      <p className="mt-1 text-sm text-muted-foreground sm:hidden">
                        {info.blurb}
                      </p>
                    )}
                  </div>

                  {uploaded ? (
                    content && (
                      <>
                      <div
                        className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
                        title={content.sha256}
                      >
                        <span>{formatFileSize(content.sizeBytes)}</span>
                        {content.sha256 && (
                          <>
                            <span>·</span>
                            <span className="font-mono">
                              sha256 {content.sha256.slice(0, 10)}...
                            </span>
                          </>
                        )}
                        {content.createdAt && (
                          <>
                            <span>·</span>
                            <span>added</span>
                            <RelativeTime value={content.createdAt} />
                          </>
                        )}
                      </div>
                      <div className="mt-3">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-10 rounded-lg sm:h-8"
                        >
                          <a href={downloadHref(kind)}>
                            <IconDownload className="size-4" aria-hidden="true" />
                            <span>Download</span>
                          </a>
                        </Button>
                      </div>
                      </>
                    )
                  ) : (
                    <div className="mt-3">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-10 rounded-lg sm:h-8",
                          workspaceLinkTone,
                          "hover:text-near-cobalt dark:hover:text-primary"
                        )}
                      >
                        <a href="#item-details">
                          <span>Add {info.name.toLowerCase()}</span>
                          <IconArrowRight className="size-4" aria-hidden="true" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </FormSection>
      )}

      {/* 4. Publishing Section */}
      <FormSection
        title="Publishing"
        description="These checks run on the server and decide whether this item can go live."
      >
        {publishError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {publishError}
          </div>
        )}

        {checks.isLoading && (
          <p className="text-sm text-muted-foreground">Running checks...</p>
        )}

        {checks.isError && (
          <p className="text-sm font-semibold text-destructive">
            Failed to load review checks
            {checks.error instanceof Error ? `: ${checks.error.message}` : "."}
          </p>
        )}

        {/* Gate on !isError too — React Query keeps the last-good `data`
            across a failed refetch, so without this a failed background
            refetch would leave stale rows on screen alongside the error message. */}
        {checks.data && !checks.isError && (
          <div className="space-y-3">
            {checks.data.checks.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No checks reported.
              </p>
            )}
            {checks.data.checks.map((check) => {
              const isPass = check.status === "pass"
              const isWarn = check.status === "warn"
              const StatusIcon = isPass
                ? IconCheck
                : isWarn
                  ? IconAlertTriangle
                  : IconX
              const iconWrapClass = isPass
                ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-400"
                : isWarn
                  ? "bg-amber-500/10 text-amber-800 dark:text-amber-400"
                  : "bg-destructive/10 text-red-700 dark:text-destructive"
              const badgeClass = isPass
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400"
                : isWarn
                  ? "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-400"
                  : "border-destructive/30 bg-destructive/10 text-red-700 dark:text-destructive"
              const statusWord = isPass
                ? "Passed"
                : isWarn
                  ? "Warning"
                  : "Blocked"

              return (
                <div
                  key={check.id}
                  data-check-id={check.id}
                  data-check-status={check.status}
                  className="flex min-w-0 items-start gap-3 rounded-xl border border-[var(--ironhub-line)] bg-background/40 p-4"
                >
                  <div
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full",
                      iconWrapClass
                    )}
                    aria-hidden="true"
                  >
                    <StatusIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 text-sm font-medium [overflow-wrap:anywhere] break-words text-foreground">
                        {check.label}
                      </span>
                      <AttributeBadge className={cn("shrink-0", badgeClass)}>
                        {statusWord}
                      </AttributeBadge>
                    </div>
                    {check.detail && (
                      <p className="min-w-0 text-sm [overflow-wrap:anywhere] break-words text-muted-foreground">
                        {check.detail}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </FormSection>

    </div>
  )
}
