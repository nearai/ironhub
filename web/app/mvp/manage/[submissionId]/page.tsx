"use client"

import React, { use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePartnerStore } from "@/features/partner/store/partner-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  IconArrowLeft,
  IconCheck,
  IconX,
  IconChevronDown,
  IconChevronUp,
  IconExternalLink,
  IconSettings,
  IconActivity,
  IconTrash,
  IconRefresh,
  IconDownload,
  IconUsers,
  IconCircleCheck,
  IconClock,
  IconWorld,
  IconLock,
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
  const { state, updateSubmission, removeSubmission, notify } = usePartnerStore()
  const { submissions } = state

  const submission = submissions.find((sub) => sub.id === submissionId)

  // Accordion state for check items
  const [expandedChecks, setExpandedChecks] = useState<Record<string, boolean>>({
    "Security Scan": true,
    "Manifest Validation": true,
    "Dependency Check": false,
  })

  // Dialog state for mock updating
  const [isUpdateOpen, setIsUpdateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isRerunning, setIsRerunning] = useState(false)
  const [newVersion, setNewVersion] = useState("")
  const [newBranch, setNewBranch] = useState("")
  const [newVisibility, setNewVisibility] = useState<"public" | "private">("private")

  // Seed the form whenever the dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open && submission) {
      setNewVersion(submission.version)
      setNewBranch(submission.branch)
      setNewVisibility(submission.visibility)
    }
    setIsUpdateOpen(open)
  }

  if (!submission) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-bold text-foreground">Submission not found</h3>
        <Button asChild variant="link" className="mt-2">
          <Link href="/mvp/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    )
  }

  const toggleCheck = (name: string) => {
    setExpandedChecks((prev) => ({
      ...prev,
      [name]: !prev[name],
    }))
  }

  const handleUpdateSubmission = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newVersion) return

    // Perform state update
    updateSubmission(submission.id, {
      version: newVersion,
      branch: newBranch || submission.branch,
      visibility: newVisibility,
      status: "approved", // Automatically fix rejection in MVP
      reviews: [
        { name: "Security Scan", status: "passed", details: "All WASM sandbox constraints verified. Re-scan completed with 0 errors." },
        { name: "Manifest Validation", status: "passed", details: "Manifest formatting rules passed. Correct permissions set." },
        { name: "Dependency Check", status: "passed", details: "0 security vulnerabilities found in libraries." }
      ]
    })

    setIsUpdateOpen(false)
    setNewVersion("")
    setNewBranch("")
    notify(`${submission.title} updated → approved`)
  }

  const handleRerunChecks = () => {
    if (!submission || isRerunning) return
    setIsRerunning(true)
    // Simulate the automated pipeline re-running
    setTimeout(() => {
      updateSubmission(submission.id, {
        status: "approved",
        reviews: [
          { name: "Security Scan", status: "passed", details: "Re-scan completed. All WASM sandbox constraints verified with 0 errors." },
          { name: "Manifest Validation", status: "passed", details: "Manifest re-validated. Required permissions present." },
          { name: "Dependency Check", status: "passed", details: "0 security vulnerabilities found in libraries." },
        ],
      })
      setIsRerunning(false)
      notify(`${submission.title} re-checked → approved`)
    }, 1200)
  }

  const handleDelete = () => {
    if (!submission) return
    const title = submission.title
    removeSubmission(submission.id)
    setIsDeleteOpen(false)
    notify(`${title} deleted`, "info")
    router.push("/mvp/dashboard")
  }

  // Helper for status badge style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full">
            Approved
          </Badge>
        )
      case "in_review":
        return (
          <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full">
            In Review
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full">
            Rejected
          </Badge>
        )
      default:
        return null
    }
  }

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
        {/* Re-run checks — only for rejected submissions */}
        {submission.status === "rejected" && (
          <Button
            type="button"
            variant="outline"
            onClick={handleRerunChecks}
            disabled={isRerunning}
            className="rounded-full"
          >
            <IconRefresh className={`size-4 ${isRerunning ? "animate-spin" : ""}`} />
            {isRerunning ? "Re-running..." : "Re-run Checks"}
          </Button>
        )}

        {/* Update Trigger */}
        <Dialog open={isUpdateOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-sm hover:shadow-md">
              Update Submission
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update {submission.title}</DialogTitle>
              <DialogDescription>
                Trigger a new release checks run by modifying the release parameters.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateSubmission} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Release Version / Tag
                </label>
                <Input
                  required
                  placeholder="e.g., v1.0.3"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Repository Branch
                </label>
                <Input
                  placeholder="e.g., main"
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                />
              </div>

              {/* Visibility selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Visibility
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewVisibility("public")}
                    aria-pressed={newVisibility === "public"}
                    className={`flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-all ${
                      newVisibility === "public"
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-[var(--ironhub-line)]/50 bg-background/30 text-muted-foreground hover:bg-muted/10"
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <IconWorld className="size-3.5 text-muted-foreground" />
                      Public
                    </span>
                    <span className="text-[10px] leading-normal">
                      Listed on the IronHub Marketplace.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVisibility("private")}
                    aria-pressed={newVisibility === "private"}
                    className={`flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-all ${
                      newVisibility === "private"
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-[var(--ironhub-line)]/50 bg-background/30 text-muted-foreground hover:bg-muted/10"
                    }`}
                  >
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <IconLock className="size-3.5 text-muted-foreground" />
                      Private
                    </span>
                    <span className="text-[10px] leading-normal">
                      Internal to your organization only.
                    </span>
                  </button>
                </div>
              </div>

              <div className="mt-2 flex gap-3">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="flex-1 rounded-full">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" className="flex-1 rounded-full">
                  Trigger Build
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
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
              <DialogTitle>Delete {submission.title}?</DialogTitle>
              <DialogDescription>
                This permanently removes the submission and its review history. This cannot be undone.
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
                className="flex-1 rounded-full"
              >
                <IconTrash className="size-4" />
                Delete
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
            <span className="text-[10px] font-bold tracking-widest text-primary uppercase">
              {submission.type} Submissions
            </span>
            <h1 className="mt-1 text-2xl font-bold text-foreground flex items-center gap-2">
              {submission.title}
              <span className="text-sm font-normal text-muted-foreground font-mono">
                {submission.version}
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 px-2 py-0.5 rounded-full text-[10px]">
              {submission.visibility === "public" ? (
                <>
                  <IconWorld className="size-3 text-muted-foreground" />
                  Public
                </>
              ) : (
                <>
                  <IconLock className="size-3 text-muted-foreground" />
                  Private
                </>
              )}
            </Badge>
            {getStatusBadge(submission.status)}
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-4 border-t border-[var(--ironhub-line)]/50 pt-6">
          <div className="rounded-xl border border-[var(--ironhub-line)]/45 bg-muted/5 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Downloads</span>
              <IconDownload className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tracking-tight text-foreground">
                {submission.status === "approved" ? "1,248" : "0"}
              </span>
              {submission.status === "approved" && (
                <span className="text-[10px] text-emerald-500 font-semibold">
                  +12%
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--ironhub-line)]/45 bg-muted/5 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Active Installs</span>
              <IconUsers className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tracking-tight text-foreground">
                {submission.status === "approved" ? "412" : "0"}
              </span>
              {submission.status === "approved" && (
                <span className="text-[10px] text-emerald-500 font-semibold">
                  98%
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--ironhub-line)]/45 bg-muted/5 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Success Rate</span>
              <IconCircleCheck className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tracking-tight text-foreground">
                {submission.status === "approved" ? "99.98%" : "--"}
              </span>
              {submission.status === "approved" && (
                <span className="text-[10px] text-muted-foreground">
                  24k runs
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--ironhub-line)]/45 bg-muted/5 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Avg Latency</span>
              <IconClock className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tracking-tight text-foreground">
                {submission.status === "approved" ? "14.2ms" : "--"}
              </span>
              {submission.status === "approved" && (
                <span className="text-[10px] text-muted-foreground">
                  p95: 22ms
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-[var(--ironhub-line)]/50 pt-6">
          <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
            <IconActivity className="size-4" />
            Review Report
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Reviewed on: 2026-05-30 14:22 UTC by Ironclaw Auto-Check Pipeline
          </p>

          {/* Audit Logs Accordions */}
          <div className="mt-4 flex flex-col gap-2">
            {submission.reviews.map((check) => {
              const isExpanded = expandedChecks[check.name]
              const isPassed = check.status === "passed"

              return (
                <div
                  key={check.name}
                  className="overflow-hidden rounded-xl border border-[var(--ironhub-line)]/50 bg-background/30"
                >
                  <button
                    type="button"
                    onClick={() => toggleCheck(check.name)}
                    className="flex w-full items-center justify-between p-3.5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      {isPassed ? (
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <IconCheck className="size-3.5" />
                        </div>
                      ) : (
                        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                          <IconX className="size-3.5" />
                        </div>
                      )}
                      <span>{check.name}</span>
                    </div>
                    {isExpanded ? (
                      <IconChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <IconChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-[var(--ironhub-line)]/30 bg-background/50 p-4 text-xs leading-relaxed text-muted-foreground">
                      <div className={isPassed ? "text-foreground/90" : "text-destructive font-medium"}>
                        {check.details}
                      </div>
                      {check.fix && (
                        <div className="mt-2.5 rounded-lg border border-primary/20 bg-primary/5 p-2 text-primary font-mono text-[10px]">
                          <span className="font-sans font-bold uppercase tracking-wider text-[9px] mr-1 block">Recommended Fix:</span>
                          {check.fix}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Configuration Section */}
        <div className="mt-6 border-t border-[var(--ironhub-line)]/50 pt-6">
          <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
            <IconSettings className="size-4" />
            Configuration & Webhook Link
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--ironhub-line)]/40 bg-muted/10 p-4">
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                GitHub Repository
              </span>
              <p className="mt-1 font-mono text-xs text-foreground/90 flex items-center gap-1">
                {submission.repoUrl}
                <a href={`https://${submission.repoUrl}`} target="_blank" rel="noreferrer" className="text-primary hover:text-primary-deep">
                  <IconExternalLink className="size-3.5 inline" />
                </a>
              </p>
              <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground">
                <div>
                  Branch: <span className="font-semibold text-foreground">{submission.branch}</span>
                </div>
                <div>
                  Entrypoint: <span className="font-mono text-foreground">{submission.entryPoint}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--ironhub-line)]/40 bg-muted/10 p-4">
              <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                Sync Connection
              </span>
              <div className="mt-1 flex items-center gap-2">
                {submission.webhookActive ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-foreground">Webhook Active</span>
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                    <span className="text-xs font-semibold text-foreground">Webhook Inactive</span>
                  </>
                )}
              </div>
              <p className="mt-2.5 text-[11px] text-muted-foreground leading-normal">
                Webhook receives status notifications on git pushes. Configure webhooks in the Settings console.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
