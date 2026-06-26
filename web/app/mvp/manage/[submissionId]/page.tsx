"use client"

import React, { use, useState, useEffect } from "react"
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
  IconBox,
  IconUpload,
  IconFileZip,
  IconCopy,
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
  const { submissions, installToken } = state

  const submission = submissions.find((sub) => sub.id === submissionId)

  // Accordion state for check items
  const [expandedChecks, setExpandedChecks] = useState<Record<string, boolean>>({
    "Safety & Policy Scan": true,
    "Configuration Check": true,
    "Component Quality Check": false,
  })

  // Dialog state for mock updating
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isRerunning, setIsRerunning] = useState(false)
  const [copiedInstall, setCopiedInstall] = useState(false)

  if (!submission) {
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
    const cmd = `ironclaw hub install ${submission.id}${submission.visibility === "private" ? ` --token ${installToken}` : ""}`
    try {
      await navigator.clipboard.writeText(cmd)
      setCopiedInstall(true)
      setTimeout(() => setCopiedInstall(false), 2000)
      notify("Install command copied", "info")
    } catch (e) {
      console.error(e)
    }
  }

  const toggleCheck = (name: string) => {
    setExpandedChecks((prev) => ({
      ...prev,
      [name]: !prev[name],
    }))
  }



  const handleRerunChecks = () => {
    if (!submission || isRerunning) return
    setIsRerunning(true)
    setTimeout(() => {
      updateSubmission(submission.id, {
        status: "approved",
        reviews: [
          { name: "Safety & Policy Scan", status: "passed", details: "Safety re-scan passed successfully. Prompt constraints verified." },
          { name: "Configuration Check", status: "passed", details: "All configuration elements correctly structured and validated." },
          { name: "Component Quality Check", status: "passed", details: "0 verification issues found in compilation." }
        ],
      })
      setIsRerunning(false)
      notify(`${submission.title} safety check completed → approved`)
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
          <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider text-xs px-2 py-0.5 rounded-full">
            Approved
          </Badge>
        )
      case "in_review":
        return (
          <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider text-xs px-2 py-0.5 rounded-full">
            In Review
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="font-semibold uppercase tracking-wider text-xs px-2 py-0.5 rounded-full">
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
          {/* Re-run checks — only for rejected items */}
          {submission.status === "rejected" && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRerunChecks}
              disabled={isRerunning}
              className="rounded-full"
            >
              <IconRefresh className={`size-4 ${isRerunning ? "animate-spin" : ""}`} />
              {isRerunning ? "Running Checks..." : "Re-run Policy Scan"}
            </Button>
          )}

          {/* CLI Install Copy Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyInstall}
            className="rounded-full shadow-sm hover:shadow-md"
          >
            {copiedInstall ? (
              <>
                <IconCheck className="size-4 mr-1.5 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <IconCopy className="size-4 mr-1.5 text-muted-foreground" />
                Copy Install Command
              </>
            )}
          </Button>

          {/* Conditional Trigger based on item type */}
          {submission.type === "skill" ? (
            <Button asChild className="rounded-full shadow-sm hover:shadow-md">
              <Link href={`/mvp/edit-skill/${submission.id}`}>
                Update Skill
              </Link>
            </Button>
          ) : (
            <Button asChild className="rounded-full shadow-sm hover:shadow-md">
              <Link href={`/mvp/edit-tool/${submission.id}`}>
                Update Tool
              </Link>
            </Button>
          )}

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
                  This permanently removes the item from your organization's Private Space. Members will lose access to run it.
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
              {submission.type} Catalog Item
            </span>
            <h1 className="mt-1 text-2xl font-bold text-foreground flex items-center gap-2">
              {submission.title}
              <span className="text-sm font-normal text-muted-foreground font-mono">
                {submission.version}
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 px-2 py-0.5 rounded-full text-xs">
              {submission.visibility === "public" ? (
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
            {getStatusBadge(submission.status)}
          </div>
        </div>

        {submission.valueProp && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed max-w-xl">
            {submission.valueProp}
          </p>
        )}

        {/* Telemetry Metrics Grid */}
        <div className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-4 border-t border-[var(--ironhub-line)]/50 pt-6">
          <div className="rounded-xl border border-[var(--ironhub-line)]/45 bg-muted/5 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Downloads</span>
              <IconDownload className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tracking-tight text-foreground">
                {submission.status === "approved" ? "1,248" : "0"}
              </span>
              {submission.status === "approved" && (
                <span className="text-xs text-emerald-500 font-semibold">
                  +12%
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--ironhub-line)]/45 bg-muted/5 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Active Installs</span>
              <IconUsers className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tracking-tight text-foreground">
                {submission.status === "approved" ? "412" : "0"}
              </span>
              {submission.status === "approved" && (
                <span className="text-xs text-emerald-500 font-semibold">
                  98%
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--ironhub-line)]/45 bg-muted/5 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Success Rate</span>
              <IconCircleCheck className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tracking-tight text-foreground">
                {submission.status === "approved" ? "99.98%" : "--"}
              </span>
              {submission.status === "approved" && (
                <span className="text-xs text-muted-foreground">
                  24k runs
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--ironhub-line)]/45 bg-muted/5 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Avg Latency</span>
              <IconClock className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tracking-tight text-foreground">
                {submission.status === "approved" ? "14.2ms" : "--"}
              </span>
              {submission.status === "approved" && (
                <span className="text-xs text-muted-foreground">
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
          <p className="mt-1 text-xs text-muted-foreground">
            Reviewed on: 2026-05-30 14:22 UTC by IronHub Safety & Scan Engine
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
                        <div className="mt-2.5 rounded-lg border border-primary/20 bg-primary/5 p-2 text-primary font-mono text-xs">
                          <span className="font-sans font-bold uppercase tracking-wider text-xs mr-1 block">Recommended Correction:</span>
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
        {/* <div className="mt-6 border-t border-[var(--ironhub-line)]/50 pt-6">
          <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
            <IconSettings className="size-4" />
            Item Details & Source Parameters
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--ironhub-line)]/40 bg-muted/10 p-4">
              <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Source Type
              </span>
              <p className="mt-1 font-semibold text-xs text-foreground/90 flex items-center gap-1">
                <IconBox className="size-3.5 text-primary" />
                {submission.sourceType === "upload" ? "Packaged Archive Upload" : "In-Browser Custom Prompt"}
              </p>
              <div className="mt-3 flex flex-col gap-1.5 text-xs text-muted-foreground">
                <div className="truncate">
                  Source: <span className="font-mono text-foreground font-bold">{submission.sourceDetail}</span>
                </div>
                <div>
                  Trigger Keyword: <span className="font-semibold text-foreground bg-primary/10 px-1 rounded">@{submission.activationKeyword || "trigger"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--ironhub-line)]/40 bg-muted/10 p-4">
              <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                Entitlement & Install Token
              </span>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-foreground">Available to Install</span>
              </div>
              <p className="mt-2.5 text-xs text-muted-foreground leading-normal">
                Members can install this item into their IronClaw agent workspace. Authentication token in settings is active: <code className="font-mono bg-background/50 px-1 text-xs">{installToken.slice(0, 12)}...</code>.
              </p>
            </div>
          </div>
        </div> */}
      </Card>
    </div>
  )
}
