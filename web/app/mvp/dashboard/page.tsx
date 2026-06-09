"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePartnerStore } from "@/features/partner/store/partner-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  IconPlus,
  IconSearch,
  IconSparkles,
  IconTool,
  IconArrowRight,
  IconWorld,
  IconLock,
} from "@tabler/icons-react"

export default function DashboardPage() {
  const { state } = usePartnerStore()
  const { submissions } = state

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [visibilityFilter, setVisibilityFilter] = useState("all")

  // Status rollup across all submissions (independent of active filters)
  const counts = {
    all: submissions.length,
    approved: submissions.filter((s) => s.status === "approved").length,
    in_review: submissions.filter((s) => s.status === "in_review").length,
    rejected: submissions.filter((s) => s.status === "rejected").length,
  }

  const summaryChips: { key: string; label: string; value: number; tone: string }[] = [
    { key: "all", label: "Total", value: counts.all, tone: "border-[var(--ironhub-line)] text-foreground" },
    { key: "approved", label: "Approved", value: counts.approved, tone: "border-emerald-500/25 text-emerald-600 dark:text-emerald-400" },
    { key: "in_review", label: "In Review", value: counts.in_review, tone: "border-amber-500/25 text-amber-600 dark:text-amber-400" },
    { key: "rejected", label: "Rejected", value: counts.rejected, tone: "border-destructive/25 text-destructive" },
  ]

  // Filter submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch = sub.title.toLowerCase().includes(search.toLowerCase()) || 
      sub.repoUrl.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter
    const matchesVisibility = visibilityFilter === "all" || sub.visibility === visibilityFilter

    return matchesSearch && matchesStatus && matchesVisibility
  })

  // Helper for status badge style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full">
            ● Approved
          </Badge>
        )
      case "in_review":
        return (
          <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full">
            ● In Review
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full">
            ● Rejected
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Hero Heading Section */}
      <Card className="relative overflow-hidden border border-[var(--ironhub-line)] bg-card/60 p-6 shadow-sm sm:p-8">
        {/* Ambient background glow */}
        <div className="absolute right-0 top-0 -z-10 h-32 w-64 bg-primary/5 blur-3xl rounded-full" />
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1 sm:space-y-2">
            <span className="text-[10px] font-bold tracking-widest text-primary uppercase sm:text-xs">
              Developer Dashboard
            </span>
            <h1 className="font-heading text-2xl font-bold leading-tight sm:text-4xl text-foreground">
              Submissions
            </h1>
            <p className="max-w-xl text-xs text-muted-foreground sm:text-sm leading-relaxed">
              Manage, track, and configure your enterprise integrations on IronHub.
            </p>
          </div>

          <Button asChild className="shrink-0 rounded-full shadow-md transition-all duration-300 hover:shadow-lg self-start sm:self-center">
            <Link href="/mvp/new-submit">
              <IconPlus className="size-4" />
              New Submission
            </Link>
          </Button>
        </div>

        {/* Status Summary Chips */}
        <div className=" flex flex-wrap gap-2.5 border-t border-[var(--ironhub-line)]/50 pt-5">
          {summaryChips.map((chip) => {
            const isActive = statusFilter === chip.key
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setStatusFilter(chip.key)}
                aria-pressed={isActive}
                className={`flex items-center gap-2 rounded-2xl border px-3.5 py-1.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${chip.tone} ${
                  isActive 
                    ? "bg-primary/5 ring-1 ring-primary/40 border-primary/30" 
                    : "bg-background/40 hover:bg-background/80"
                }`}
              >
                <span className="text-sm font-bold tabular-nums">{chip.value}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  {chip.label}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--ironhub-line)] bg-background/50 p-4 shadow-sm sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search your skills or repos..."
            className="pl-9 rounded-full bg-background/70"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Status:</span>
            <NativeSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-full select-none"
            >
              <NativeSelectOption value="all">All Statuses</NativeSelectOption>
              <NativeSelectOption value="approved">Approved</NativeSelectOption>
              <NativeSelectOption value="in_review">In Review</NativeSelectOption>
              <NativeSelectOption value="rejected">Rejected</NativeSelectOption>
            </NativeSelect>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Visibility:</span>
            <NativeSelect
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
              className="rounded-full select-none"
            >
              <NativeSelectOption value="all">All Visibilities</NativeSelectOption>
              <NativeSelectOption value="public">Public</NativeSelectOption>
              <NativeSelectOption value="private">Private</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Actual Submissions */}
        {filteredSubmissions.map((sub) => {
          const Icon = sub.type === "skill" ? IconSparkles : IconTool

          return (
            <Card
              key={sub.id}
              className="group relative flex flex-col justify-between overflow-hidden border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-card/90 hover:shadow-md"
            >
              <div>
                {/* Card Top */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-primary/80">
                        {sub.type}
                      </span>
                      <h3 className="text-sm font-bold text-foreground">
                        {sub.title}
                      </h3>
                    </div>
                  </div>
                  {getStatusBadge(sub.status)}
                </div>

                {/* Subtitle & Metadata */}
                <div className="mt-4 flex flex-col gap-1 text-[11px] text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">{sub.version}</span>
                    <span className="mx-1.5">•</span>
                    <span>Updated {sub.updatedAt}</span>
                  </p>
                  <p className="truncate">
                    Repository: <span className="font-mono text-foreground/80">{sub.repoUrl}</span>
                  </p>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-6 flex items-center justify-between border-t border-[var(--ironhub-line)]/50 pt-3">
                <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0.5 rounded-full">
                  {sub.visibility === "public" ? (
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
                <Button asChild variant="ghost" size="sm" className="group/btn h-8 rounded-full text-xs font-semibold text-primary hover:text-primary-deep">
                  <Link href={`/mvp/manage/${sub.id}`}>
                    Manage
                    <IconArrowRight className="size-3 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            </Card>
          )
        })}

        {/* Special Submit Card */}
        <Card className="flex flex-col justify-between border border-dashed border-[var(--ironhub-line)] bg-muted/10 p-5 shadow-none transition-all duration-300 hover:border-primary/40 hover:bg-muted/20">
          <div>
            <div className="flex size-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <IconPlus className="size-4" />
            </div>
            <h3 className="mt-3 text-sm font-bold text-foreground">
              New Submission
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Start a new integration release pipeline via GitHub webhook syncing or manual ZIP payload upload.
            </p>
          </div>

          <div className="mt-6 pt-3">
            <Button asChild variant="outline" size="sm" className="w-full rounded-full text-xs font-semibold">
              <Link href="/mvp/new-submit">
                Create Submission
                <IconArrowRight className="size-3 ml-1" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>

      {filteredSubmissions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--ironhub-line)] py-16 text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            No submissions match your filters.
          </p>
          <Button variant="link" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setVisibilityFilter("all"); }}>
            Clear Search & Filters
          </Button>
        </div>
      )}
    </div>
  )
}
