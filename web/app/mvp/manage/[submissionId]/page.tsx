"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  useArtifact,
  useDeleteArtifact,
  useMintInstallToken,
} from "@/features/partner/api/artifacts"
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

const REVIEW_STUBS = [
  { name: "Safety & Policy Scan", status: "passed" as const, details: "All safety rules successfully verified." },
  { name: "Configuration Check", status: "passed" as const, details: "Configuration file and settings verified." },
  { name: "Component Quality Check", status: "passed" as const, details: "Deployment quality checks passed." },
]

export default function ManageSubmissionPage({ params }: PageProps) {
  const { submissionId } = use(params)
  const router = useRouter()
  const { notify } = useToast()
  const { data: artifact, isLoading, isError } = useArtifact(submissionId)
  const deleteArtifact = useDeleteArtifact()
  const mintToken = useMintInstallToken(submissionId)

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [copiedInstall, setCopiedInstall] = useState(false)

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

  const expectedKinds =
    artifact.type === "tool" ? ["wasm", "capabilities"] : ["skill_md"]
  const uploadedKinds = new Set(artifact.content.map((c) => c.kind))

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
            disabled={mintToken.isPending}
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

        {/* Review checks (visual stub, non-blocking, not backed by real data) */}
        <div className="mt-6 border-t border-[var(--ironhub-line)]/50 pt-6">
          <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
            <IconInfoCircle className="size-4" />
            Review Checks
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Preview only — these checks are not yet wired to a real safety engine and never block save/delete actions.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            {REVIEW_STUBS.map((check) => (
              <div
                key={check.name}
                className="flex items-center gap-2 rounded-xl border border-[var(--ironhub-line)]/50 bg-background/30 p-3.5 text-xs"
              >
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <IconCheck className="size-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-foreground">{check.name}</span>
                  <p className="text-muted-foreground/90">{check.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
