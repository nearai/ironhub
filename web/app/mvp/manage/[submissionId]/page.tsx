"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCategory,
  IconCheck,
  IconCopy,
  IconFileZip,
  IconLink,
  IconLoader2,
  IconLock,
  IconRocket,
  IconRocketOff,
  IconTrash,
  IconUpload,
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  type ContentKind,
  useArtifact,
  useArtifactChecks,
  useDeleteArtifact,
  useMintInstallToken,
  usePublishArtifact,
  useUnpublishArtifact,
  useUploadArtifactBundle,
} from "@/features/partner/api/artifacts"
import { ApiError } from "@/features/partner/api/client"
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

const CONTENT_KIND_INFO: Record<ContentKind, { name: string; blurb: string }> =
  {
    wasm: {
      name: "Program file",
      blurb: "The compiled program that does the work.",
    },
    manifest_toml: {
      name: "Setup details",
      blurb: "Describes what the tool is and how to run it.",
    },
    capabilities: {
      name: "Permissions file",
      blurb: "Lists what the tool is allowed to access.",
    },
    bundle_zip: {
      name: "Uploaded package",
      blurb: "The original .zip you uploaded.",
    },
    skill_md: {
      name: "Instructions file",
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
  const uploadArtifactBundle = useUploadArtifactBundle()

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [copiedInstall, setCopiedInstall] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [bundleReuploadError, setBundleReuploadError] = useState<string | null>(
    null
  )
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }
  const handleDragLeave = () => setDragOver(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleBundleReupload(file)
  }

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
              <Link href="/mvp/dashboard">Back to your catalog</Link>
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
  // manifest_toml and bundle_zip are optional archival kinds a bundle upload
  // also writes (design.md D3/D6) — surface them too so the manage page
  // reflects everything actually stored, not just the required kinds.
  const additionalKinds = Array.from(uploadedKinds).filter(
    (kind) => !expectedKinds.includes(kind)
  )
  const displayKinds = [...expectedKinds, ...additionalKinds]
  const isSingleCard = displayKinds.length === 1

  const handleCopyInstall = async () => {
    try {
      const { manifestUrl } = await mintToken.mutateAsync()
      await navigator.clipboard.writeText(manifestUrl)
      setCopiedInstall(true)
      setTimeout(() => setCopiedInstall(false), 2000)
      notify("Install link copied")
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Failed to copy install link",
        "error"
      )
    }
  }

  const handleDelete = async () => {
    try {
      await deleteArtifact.mutateAsync(artifact.id)
      setIsDeleteOpen(false)
      notify(`${artifact.title} deleted`, "info")
      router.push("/mvp/dashboard")
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

  // Real recovery path for a tool whose bundle upload failed after the
  // artifact row was already created (design.md D6: this page is the
  // recovery surface for a partial upload) — re-runs the same PUT the
  // create flow uses, with the same explicit `application/zip` type.
  const handleBundleReupload = async (file: File) => {
    setBundleReuploadError(null)
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setBundleReuploadError("Only .zip archives are accepted.")
      return
    }
    try {
      await uploadArtifactBundle.mutateAsync({ id: artifact.id, bytes: file })
      notify("Extension bundle uploaded")
    } catch (error) {
      setBundleReuploadError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to upload bundle."
      )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header */}
      <WorkspacePageHeader
        backHref="/mvp/dashboard"
        backLabel="Back to your catalog"
        title={artifact.title}
        description={artifact.description ?? undefined}
        action={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
            <Button
              asChild
              className="h-10 min-w-0 flex-1 rounded-lg sm:flex-none"
            >
              <Link
                href={
                  artifact.type === "skill"
                    ? `/mvp/edit-skill/${artifact.id}`
                    : `/mvp/edit-tool/${artifact.id}`
                }
              >
                {artifact.type === "skill" ? "Edit skill" : "Edit tool"}
              </Link>
            </Button>

            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-10 shrink-0 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10"
                  aria-label={`Delete ${artifact.title}`}
                >
                  <IconTrash className="size-4" aria-hidden="true" />
                </Button>
              </DialogTrigger>
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
          <StatusBadge status={artifact.status} />
          <AttributeBadge
            icon={artifact.visibility === "private" ? IconLock : IconWorld}
          >
            {artifact.visibility === "private"
              ? "Private"
              : "Public — waiting for review"}
          </AttributeBadge>
          <AttributeBadge icon={IconCategory} muted={!artifact.category}>
            {artifact.category || "Uncategorised"}
          </AttributeBadge>
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
      </WorkspacePageHeader>

      {/* 2. Publishing Section */}
      <FormSection
        title="Publishing"
        description="These checks run on the server and decide whether this item can go live."
      >
        <div>
          {artifact.status === "published" ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleUnpublish}
              disabled={unpublishArtifact.isPending}
              className="h-10 rounded-lg"
            >
              {unpublishArtifact.isPending ? (
                <IconLoader2
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <IconRocketOff className="size-4" aria-hidden="true" />
              )}
              <span>Unpublish</span>
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
                checks.data && !checks.isError && !checks.data.publishable
                  ? "publish-blocked-reason"
                  : undefined
              }
              title={
                checks.data && !checks.isError && !checks.data.publishable
                  ? "Resolve the failing checks below before publishing."
                  : undefined
              }
              className="h-10 rounded-lg"
            >
              {publishArtifact.isPending ? (
                <IconLoader2
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <IconRocket className="size-4" aria-hidden="true" />
              )}
              <span>Publish</span>
            </Button>
          )}
        </div>

        {artifact.status !== "published" &&
          checks.data &&
          !checks.isError &&
          !checks.data.publishable && (
            <p
              id="publish-blocked-reason"
              className="text-sm text-muted-foreground"
            >
              Resolve the failing checks below before publishing.
            </p>
          )}

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

      {/* 3. Files Section */}
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
                    <span className="text-sm font-medium text-foreground">
                      {info.name}
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
                    <p className="mt-1 text-sm text-muted-foreground">
                      {info.blurb}
                    </p>
                  )}
                </div>

                {uploaded ? (
                  content && (
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
                      <Link
                        href={
                          artifact.type === "skill"
                            ? `/mvp/edit-skill/${artifact.id}`
                            : `/mvp/edit-tool/${artifact.id}`
                        }
                      >
                        <span>Add {info.name.toLowerCase()}</span>
                        <IconArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {artifact.type === "tool" && (
          <div className="mt-4 flex flex-col gap-2">
            <label
              htmlFor="bundle-reupload-input"
              className="text-sm font-medium text-foreground"
            >
              Replace the uploaded package (.zip)
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-[var(--ironhub-line)] bg-background/50 hover:border-primary/50"
              )}
            >
              <input
                id="bundle-reupload-input"
                type="file"
                accept=".zip"
                disabled={uploadArtifactBundle.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ""
                  if (file) void handleBundleReupload(file)
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <IconUpload
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="mt-2 block text-sm font-medium text-foreground">
                Drop a replacement package (.zip) here, or choose one
              </span>
              <span className="mt-1 text-sm text-muted-foreground">
                Recovery path if a bundle upload failed partway through, or to
                replace the stored package.
              </span>
            </div>
            {uploadArtifactBundle.isPending && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <IconLoader2
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                <span>Uploading...</span>
              </span>
            )}
            {uploadArtifactBundle.isSuccess &&
              !uploadArtifactBundle.isPending &&
              !bundleReuploadError && (
                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-800 dark:text-emerald-400">
                  <IconFileZip className="size-4" aria-hidden="true" />
                  <span>Bundle uploaded</span>
                </span>
              )}
            {bundleReuploadError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive">
                {bundleReuploadError}
              </div>
            )}
          </div>
        )}
      </FormSection>

      {/* 4. Install Link Section */}
      <FormSection
        title="Install link"
        description="Share this link with a member so they can add this item to their agent."
      >
        <div className="flex flex-col items-start gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyInstall}
            disabled={mintToken.isPending || !isContentComplete}
            className="h-10 rounded-lg"
          >
            {mintToken.isPending ? (
              <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : copiedInstall ? (
              <IconCheck
                className="size-4 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
            ) : (
              <IconCopy
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            <span>{copiedInstall ? "Copied" : "Copy install link"}</span>
          </Button>
          {!isContentComplete && (
            <p className="text-sm text-muted-foreground">
              Add the required files before you can copy an install link.
            </p>
          )}
        </div>
      </FormSection>
    </div>
  )
}
