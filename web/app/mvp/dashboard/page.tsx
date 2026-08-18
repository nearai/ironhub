"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconFilterOff,
  IconLayoutGrid,
  IconLock,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconTable,
  IconTool,
  IconWorld,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  type PrivateArtifact,
  useArtifacts,
} from "@/features/partner/api/artifacts"
import { ArtifactCard } from "@/features/partner/components/ui/artifact-card"
import {
  DataTable,
  type DataTableColumn,
} from "@/features/partner/components/ui/data-table"
import { EmptyState } from "@/features/partner/components/ui/empty-state"
import { RelativeTime } from "@/features/partner/components/ui/relative-time"
import { StatCard, StatRow } from "@/features/partner/components/ui/stat-card"
import { StatusBadge } from "@/features/partner/components/ui/status-badge"
import { ViewToggle } from "@/features/partner/components/ui/view-toggle"
import { WorkspacePageHeader } from "@/features/partner/components/ui/workspace-page-header"
import { workspaceLinkTone } from "@/features/partner/components/ui/tone"
import { CATEGORIES } from "@/lib/catalog/inference"
import { cn } from "@/lib/shared/utils"

function useIsBelowMd(): boolean {
  const subscribe = React.useCallback((callback: () => void) => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return () => {}
    }
    const mql = window.matchMedia("(max-width: 767px)")
    mql.addEventListener("change", callback)
    return () => mql.removeEventListener("change", callback)
  }, [])

  const getSnapshot = React.useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false
    }
    return window.matchMedia("(max-width: 767px)").matches
  }, [])

  const getServerSnapshot = React.useCallback(() => false, [])

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

function filterOptionLabel(prefix: string, label: string): string {
  return `${prefix}: ${label}`
}

const VIEW_OPTIONS = [
  { value: "table" as const, label: "Table", icon: IconTable },
  { value: "cards" as const, label: "Cards", icon: IconLayoutGrid },
]

export default function DashboardPage() {
  const { data: submissions, isLoading, isError, error } = useArtifacts()

  const [search, setSearch] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [visibilityFilter, setVisibilityFilter] = React.useState("all")
  const [categoryFilter, setCategoryFilter] = React.useState("all")

  const [view, setView] = React.useState<"table" | "cards">("table")

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = window.sessionStorage.getItem("ironhub.mvp.catalogView")
        if (stored === "table" || stored === "cards") {
          // The sessionStorage view preference must be applied after mount so the server-rendered default ("table") and the first client render agree (design decision D3).
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setView(stored)
        }
      }
    } catch {
      // Ignore sessionStorage exceptions
    }
  }, [])

  const handleViewChange = React.useCallback((next: "table" | "cards") => {
    setView(next)
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("ironhub.mvp.catalogView", next)
      }
    } catch {
      // Ignore sessionStorage exceptions
    }
  }, [])

  const isBelowMd = useIsBelowMd()
  const effectiveView = isBelowMd ? "cards" : view

  const items = React.useMemo(() => submissions ?? [], [submissions])

  const totalCount = items.length
  const skillCount = items.filter((item) => item.type === "skill").length
  const toolCount = items.filter((item) => item.type === "tool").length
  const draftCount = items.filter((item) => item.status === "draft").length

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !search.trim() ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.name.toLowerCase().includes(search.toLowerCase())
      const matchesType = typeFilter === "all" || item.type === typeFilter
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter
      const matchesVisibility =
        visibilityFilter === "all" || item.visibility === visibilityFilter
      const matchesCategory =
        categoryFilter === "all" ||
        (categoryFilter === "uncategorised"
          ? !item.category
          : item.category === categoryFilter)

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesVisibility &&
        matchesCategory
      )
    })
  }, [items, search, typeFilter, statusFilter, visibilityFilter, categoryFilter])

  const handleClearFilters = () => {
    setSearch("")
    setTypeFilter("all")
    setStatusFilter("all")
    setVisibilityFilter("all")
    setCategoryFilter("all")
  }

  const columns: DataTableColumn<PrivateArtifact>[] = [
    {
      key: "name",
      header: "Name",
      wrap: true,
      cellClassName: "max-w-[20rem]",
      cell: (row) => (
        <Link
          href={`/mvp/manage/${row.id}`}
          className="group block min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="truncate text-sm font-medium text-foreground group-hover:text-near-cobalt dark:group-hover:text-primary">
            {row.title}
          </div>
          <div className="truncate font-mono text-xs text-muted-foreground">
            {row.name}
          </div>
        </Link>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => {
        const Icon = row.type === "skill" ? IconSparkles : IconTool
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            <span>{row.type === "skill" ? "Skill" : "Tool"}</span>
          </span>
        )
      },
    },
    {
      key: "category",
      header: "Category",
      cell: (row) =>
        row.category ? (
          <span className="text-sm text-foreground">{row.category}</span>
        ) : (
          <span className="text-sm italic text-muted-foreground">
            Uncategorised
          </span>
        ),
    },
    {
      key: "visibility",
      header: "Visibility",
      cell: (row) => {
        const Icon = row.visibility === "private" ? IconLock : IconWorld
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            <span>{row.visibility === "private" ? "Private" : "Public"}</span>
          </span>
        )
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "updatedAt",
      header: "Updated",
      cell: (row) => (
        <RelativeTime
          value={row.updatedAt}
          className="text-xs text-muted-foreground"
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      srOnlyHeader: true,
      align: "right",
      cell: (row) => (
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
          <Link href={`/mvp/manage/${row.id}`}>Manage</Link>
        </Button>
      ),
    },
  ]

  const emptyState =
    items.length === 0 ? (
      <EmptyState
        icon={IconSparkles}
        title="No skills or tools yet"
        description="Add your first skill or tool to share it with your organization."
        action={
          <Button asChild className="h-10 rounded-lg">
            <Link href="/mvp/new-submit">Add skill or tool</Link>
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={IconFilterOff}
        title="Nothing matches these filters"
        description="Try a different search term, or clear the filters to see everything again."
        action={
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg"
            onClick={handleClearFilters}
          >
            Clear filters
          </Button>
        }
      />
    )

  const tableEmptyState = React.cloneElement(emptyState, {
    className: "border-0 bg-transparent",
  })

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Page Header */}
      <WorkspacePageHeader
        title="Your skills and tools"
        description="Everything your organization has added to its private space."
        action={
          <Button asChild className="h-10 rounded-lg">
            <Link href="/mvp/new-submit">
              <IconPlus className="size-4" aria-hidden="true" />
              <span>Add skill or tool</span>
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-xl border border-[var(--ironhub-line)] bg-card"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Failed to load your items
          {error instanceof Error ? `: ${error.message}` : "."}
        </div>
      ) : (
        <>
          {/* 2. KPI Row */}
          <StatRow columns={4}>
            <StatCard
              label="Total items"
              value={totalCount}
              selected={
                !search &&
                typeFilter === "all" &&
                statusFilter === "all" &&
                visibilityFilter === "all" &&
                categoryFilter === "all"
              }
              onSelect={handleClearFilters}
            />
            <StatCard
              label="Skills"
              value={skillCount}
              selected={typeFilter === "skill"}
              onSelect={() => {
                setTypeFilter(typeFilter === "skill" ? "all" : "skill")
              }}
            />
            <StatCard
              label="Tools"
              value={toolCount}
              selected={typeFilter === "tool"}
              onSelect={() => {
                setTypeFilter(typeFilter === "tool" ? "all" : "tool")
              }}
            />
            <StatCard
              label="Drafts"
              value={draftCount}
              tone="draft"
              selected={statusFilter === "draft"}
              onSelect={() => {
                setStatusFilter(statusFilter === "draft" ? "all" : "draft")
              }}
            />
          </StatRow>

          {/* 3. Filter Toolbar */}
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--ironhub-line)] bg-card p-3 shadow-[var(--ironhub-shadow)]">
            <div className="relative w-full">
              <IconSearch
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name"
                aria-label="Search your skills and tools"
                className="h-10 rounded-lg pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <NativeSelect
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter by type"
                className="w-full sm:w-auto"
                selectClassName="h-10 rounded-lg"
              >
                <NativeSelectOption value="all">All types</NativeSelectOption>
                <NativeSelectOption value="skill">
                  {filterOptionLabel("Type", "Skills")}
                </NativeSelectOption>
                <NativeSelectOption value="tool">
                  {filterOptionLabel("Type", "Tools")}
                </NativeSelectOption>
              </NativeSelect>

              <NativeSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
                className="w-full sm:w-auto"
                selectClassName="h-10 rounded-lg"
              >
                <NativeSelectOption value="all">All statuses</NativeSelectOption>
                <NativeSelectOption value="draft">
                  {filterOptionLabel("Status", "Drafts")}
                </NativeSelectOption>
                <NativeSelectOption value="published">
                  {filterOptionLabel("Status", "Published")}
                </NativeSelectOption>
              </NativeSelect>

              <NativeSelect
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value)}
                aria-label="Filter by visibility"
                className="w-full sm:w-auto"
                selectClassName="h-10 rounded-lg"
              >
                <NativeSelectOption value="all">
                  All visibilities
                </NativeSelectOption>
                <NativeSelectOption value="private">
                  {filterOptionLabel("Visibility", "Private")}
                </NativeSelectOption>
                <NativeSelectOption value="public">
                  {filterOptionLabel("Visibility", "Public")}
                </NativeSelectOption>
              </NativeSelect>

              <NativeSelect
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by category"
                className="w-full sm:w-auto"
                selectClassName="h-10 rounded-lg"
              >
                <NativeSelectOption value="all">
                  All categories
                </NativeSelectOption>
                <NativeSelectOption value="uncategorised">
                  {filterOptionLabel("Category", "Uncategorised")}
                </NativeSelectOption>
                {CATEGORIES.map((category) => (
                  <NativeSelectOption key={category} value={category}>
                    {filterOptionLabel("Category", category)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>

              <div className="hidden md:block md:ml-auto">
                <ViewToggle
                  value={view}
                  onChange={handleViewChange}
                  options={VIEW_OPTIONS}
                  label="View"
                />
              </div>
            </div>
          </div>

          {/* 4. Table or Cards View */}
          {effectiveView === "table" ? (
            <DataTable<PrivateArtifact>
              columns={columns}
              rows={filteredItems}
              rowKey={(r) => r.id}
              caption="Your skills and tools"
              empty={tableEmptyState}
            />
          ) : filteredItems.length === 0 ? (
            emptyState
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredItems.map((item) => (
                <ArtifactCard
                  key={item.id}
                  type={item.type}
                  title={item.title}
                  version={item.version}
                  status={item.status}
                  description={item.description}
                  visibility={item.visibility}
                  category={item.category}
                  fileCount={item.content.length}
                  updatedAt={item.updatedAt}
                  href={`/mvp/manage/${item.id}`}
                  actionLabel="Manage"
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
