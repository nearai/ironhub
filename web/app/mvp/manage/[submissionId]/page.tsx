"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  useArtifact,
  useArtifactChecks,
  useDeleteArtifact,
  useMintInstallToken,
  usePublishArtifact,
  useUnpublishArtifact,
} from "@/features/partner/api/artifacts"
import { ApiError } from "@/features/partner/api/client"
import { useToast } from "@/features/partner/store/toast-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  IconArrowLeft,
  IconCheck,
  IconTrash,
  IconDownload,
  IconWorld,
  IconLock,
  IconCopy,
  IconInfoCircle,
  IconLoader2,
  IconAlertTriangle,
  IconX,
  IconRocket,
  IconCategory,
  IconLink,
} from "@tabler/icons-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"

interface PageProps {
  params: Promise<{ submissionId: string }>
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
  const [publishError, setPublishError] = useState<string | null>(null)

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading item...</div>
  }

  if (isError || !artifact) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-bold text-foreground">Item not found</h3>
        <Button asChild variant="link" className="mt-2">
          <Link href="/mvp/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    )
  }

  const expectedKinds =
    artifact.type === "tool" ? ["wasm", "capabilities"] : ["skill_md"]
  const uploadedKinds = new Set(artifact.content.map((c) => c.kind))
  const isContentComplete = expectedKinds.every((kind) => uploadedKinds.has(kind as never))

  const handleCopyInstall = async () => {
    try {
      const { manifestUrl } = await mintToken.mutateAsync()
      await navigator.clipboard.writeText(manifestUrl)
      setCopiedInstall(true)
      setTimeout(() => setCopiedInstall(false), 2000)
      notify("Install link copied")
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to mint install link", "error")
    }
  }

  const handleDelete = async () => {
    try {
      await deleteArtifact.mutateAsync(artifact.id)
      setIsDeleteOpen(false)
      notify(`${artifact.title} deleted`, "info")
      router.push("/mvp/dashboard")
    } catch (error) {
      notify(error instanceof Error ? error.message : "Failed to delete item", "error")
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
      notify(error instanceof Error ? error.message : "Failed to unpublish item.", "error")
    }
  }

  const getStatusBadge = (status: string) => (
    <Badge
      className={
        status === "published"
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider text-xs px-2 py-0.5 rounded-full"
          : "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider text-xs px-2 py-0.5 rounded-full"
      }
    >
      {status}
    </Badge>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation and Actions */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-foreground">
          <Link href="/mvp/dashboard">
            <IconArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyInstall}
            disabled={mintToken.isPending || !isContentComplete}
            title={
              isContentComplete
                ? undefined
                : "Upload all required content files before minting an install link"
            }
            className="rounded-full shadow-sm hover:shadow-md"
          >
            {mintToken.isPending ? (
              <IconLoader2 className="size-4 mr-1.5 animate-spin" />
            ) : copiedInstall ? (
              <IconCheck className="size-4 mr-1.5 text-emerald-500" />
            ) : (
              <IconCopy className="size-4 mr-1.5 text-muted-foreground" />
            )}
            {copiedInstall ? "Copied!" : "Copy Install Link"}
          </Button>

          {artifact.type === "skill" ? (
            <Button asChild className="rounded-full shadow-sm hover:shadow-md">
              <Link href={`/mvp/edit-skill/${artifact.id}`}>Update Skill</Link>
            </Button>
          ) : (
            <Button asChild className="rounded-full shadow-sm hover:shadow-md">
              <Link href={`/mvp/edit-tool/${artifact.id}`}>Update Tool</Link>
            </Button>
          )}

          <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Delete submission"
                className="rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <IconTrash className="size-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Delete {artifact.title}?</DialogTitle>
                <DialogDescription>
                  This permanently removes the item from your organization&apos;s Private Space. Members will lose access to run it.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-2 flex gap-3">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="flex-1 rounded-full">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteArtifact.isPending}
                  className="flex-1 rounded-full"
                >
                  <IconTrash className="size-4" />
                  Delete Item
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Details Card */}
      <Card className="border border-[var(--ironhub-line)] bg-card/60 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-bold tracking-widest text-primary uppercase">
              Manage {artifact.type}
            </span>
            <h1 className="mt-1 text-2xl font-bold text-foreground flex items-center gap-2">
              {artifact.title}
              <span className="text-sm font-normal text-muted-foreground font-mono">
                {artifact.version}
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 px-2 py-0.5 rounded-full text-xs">
              {artifact.visibility === "public" ? (
                <>
                  <IconWorld className="size-3 text-muted-foreground" />
                  Public Hub
                </>
              ) : (
                <>
                  <IconLock className="size-3 text-muted-foreground" />
                  Private Space
                </>
              )}
            </Badge>
            {getStatusBadge(artifact.status)}
          </div>
        </div>

        {artifact.description && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-xl">
            {artifact.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={`gap-1 px-2 py-0.5 rounded-full text-xs ${artifact.category ? "" : "text-muted-foreground/70 italic"}`}
          >
            <IconCategory className="size-3 text-muted-foreground" />
            {artifact.category ?? "Uncategorised"}
          </Badge>
          {artifact.sourceUrl && (
            <a
              href={artifact.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-[var(--ironhub-line)] px-2 py-0.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <IconLink className="size-3" />
              Repository
            </a>
          )}
        </div>

        {/* Content status */}
        <div className="mt-6 border-t border-[var(--ironhub-line)]/50 pt-6">
          <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
            <IconDownload className="size-4" />
            Content Files
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {expectedKinds.map((kind) => {
              const uploaded = uploadedKinds.has(kind as never)
              const content = artifact.content.find((c) => c.kind === kind)
              return (
                <div
                  key={kind}
                  className={`rounded-xl border p-3.5 text-xs ${uploaded
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-amber-500/20 bg-amber-500/5"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-foreground">{kind}</span>
                    <span
                      className={
                        uploaded
                          ? "text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[10px]"
                          : "text-amber-600 dark:text-amber-400 font-bold uppercase text-[10px]"
                      }
                    >
                      {uploaded ? "Uploaded" : "Missing"}
                    </span>
                  </div>
                  {content && (
                    <p className="mt-1 text-muted-foreground">
                      {(content.sizeBytes / 1024).toFixed(1)} KB · sha256 {content.sha256.slice(0, 10)}...
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Review checks — rendered verbatim from the server; no check is invented client-side. */}
        <div className="mt-6 border-t border-[var(--ironhub-line)]/50 pt-6">
          <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
            <IconInfoCircle className="size-4" />
            Review Checks
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            These checks reflect live server state and gate whether the item can be published.
          </p>

          {checks.isLoading && (
            <p className="mt-4 text-xs text-muted-foreground">Running checks...</p>
          )}

          {checks.isError && (
            <p className="mt-4 text-xs font-semibold text-destructive">
              Failed to load review checks
              {checks.error instanceof Error ? `: ${checks.error.message}` : "."}
            </p>
          )}

          {checks.data && (
            <div className="mt-4 flex flex-col gap-2">
              {checks.data.checks.length === 0 && (
                <p className="text-xs text-muted-foreground italic leading-normal">
                  No checks reported.
                </p>
              )}
              {checks.data.checks.map((check) => {
                const style =
                  check.status === "pass"
                    ? { Icon: IconCheck, wrap: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" }
                    : check.status === "warn"
                      ? { Icon: IconAlertTriangle, wrap: "bg-amber-500/10 text-amber-600 dark:text-amber-400" }
                      : { Icon: IconX, wrap: "bg-destructive/10 text-destructive" }
                return (
                  <div
                    key={check.id}
                    className="flex items-center gap-2 rounded-xl border border-[var(--ironhub-line)]/50 bg-background/30 p-3.5 text-xs"
                  >
                    <div className={`flex size-5 shrink-0 items-center justify-center rounded-full ${style.wrap}`}>
                      <style.Icon className="size-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">{check.label}</span>
                      <p className="text-muted-foreground/90">{check.detail}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {publishError && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs font-semibold text-destructive">
              {publishError}
            </div>
          )}

          <div className="mt-4">
            {artifact.status === "published" ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleUnpublish}
                disabled={unpublishArtifact.isPending}
                className="rounded-full"
              >
                {unpublishArtifact.isPending ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconRocket className="size-4" />
                )}
                Unpublish
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handlePublish}
                disabled={publishArtifact.isPending || checks.isLoading || !checks.data?.publishable}
                title={
                  checks.data && !checks.data.publishable
                    ? "Resolve the failing checks above before publishing"
                    : undefined
                }
                className="rounded-full"
              >
                {publishArtifact.isPending ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconRocket className="size-4" />
                )}
                Publish
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
