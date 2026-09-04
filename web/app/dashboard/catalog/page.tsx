"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  IconBackpack,
  IconFilePencil,
  IconFilterOff,
  IconLayoutGrid,
  IconLock,
  IconPackage,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconTable,
  IconTool,
  IconUserHeart,
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
import { FilterMenu } from "@/features/partner/components/ui/filter-menu"
import { ViewToggle } from "@/features/partner/components/ui/view-toggle"
import { WorkspacePageHeader } from "@/features/partner/components/ui/workspace-page-header"
import { workspaceLinkTone } from "@/features/partner/components/ui/tone"
import { CATEGORIES } from "@/lib/catalog/inference"
import {
  ARTIFACT_TYPES,
  ARTIFACT_TYPE_LABELS,
  type ArtifactType,
  isArtifactType,
} from "@/lib/private-artifacts/artifact-types"
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

const VIEW_OPTIONS = [
  { value: "table" as const, label: "Table", icon: IconTable },
  { value: "cards" as const, label: "Cards", icon: IconLayoutGrid },
]

const TYPE_ICONS: Record<ArtifactType, React.ComponentType<{ className?: string }>> = {
  skill: IconSparkles,
  tool: IconTool,
  soul: IconUserHeart,
  loadout: IconBackpack,
}

/** No type selected -- every type is listed. Not itself an artifact type. */
const ALL_TYPES = "all"

/**
 * Total, one card per supported type, and Drafts. Derived so a new artifact
 * type widens the row instead of being squeezed into it, and clamped because
 * `StatRow` stops laying counts out legibly past six across.
 */
const STAT_COLUMNS = Math.min(6, ARTIFACT_TYPES.length + 2) as 2 | 3 | 4 | 5 | 6

export default function CatalogPage() {
  const { data: submissions, isLoading, isError, error } = useArtifacts()

  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  // The type selection lives in the URL and nowhere else, so a filtered list
  // survives a reload, can be linked, and is the same fact the Catalog
  // sub-items in the navigation mark themselves active from. An unrecognised
  // value reads as no selection rather than as an empty list: a stale link to
  // a type that no longer exists should show the catalog, not a dead end.
  const typeParam = searchParams.get("type")
  const typeFilter: ArtifactType | typeof ALL_TYPES =
    typeParam && isArtifactType(typeParam) ? typeParam : ALL_TYPES

  const setTypeFilter = React.useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams)
      if (next === ALL_TYPES) {
        params.delete("type")
      } else {
        params.set("type", next)
      }
      const queryString = params.toString()
      // `replace`, not `push`: flipping between type sub-items is refining one
      // view, and a Back button that walks back through every refinement
      // instead of leaving the catalog is not what the reader means by it.
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      })
    },
    [pathname, router, searchParams]
  )

  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [visibilityFilter, setVisibilityFilter] = React.useState("all")
  const [categoryFilter, setCategoryFilter] = React.useState("all")

  // "all" is the unset value for every filter, so the count is just how many
  // are set to something else — what the Filters button shows at a glance.
  const activeFilterCount = [
    typeFilter,
    statusFilter,
    visibilityFilter,
    categoryFilter,
  ].filter((value) => value !== "all").length

  const clearFilters = () => {
    setTypeFilter(ALL_TYPES)
    setStatusFilter("all")
    setVisibilityFilter("all")
    setCategoryFilter("all")
  }

  const [view, setView] = React.useState<"table" | "cards">("table")

  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = window.sessionStorage.getItem(
          "ironhub.workspace.catalogView"
        )
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
        window.sessionStorage.setItem("ironhub.workspace.catalogView", next)
      }
    } catch {
      // Ignore sessionStorage exceptions
    }
  }, [])

  const isBelowMd = useIsBelowMd()
  const effectiveView = isBelowMd ? "cards" : view

  const items = React.useMemo(() => submissions ?? [], [submissions])

  const totalCount = items.length
  const draftCount = items.filter((item) => item.status === "draft").length
  // One count per supported type, keyed by the type itself, so the KPI row
  // and the filter both grow with `ARTIFACT_TYPES` rather than being edited
  // alongside it.
  const countsByType = React.useMemo(
    () =>
      Object.fromEntries(
        ARTIFACT_TYPES.map((type) => [
          type,
          items.filter((item) => item.type === type).length,
        ])
      ) as Record<ArtifactType, number>,
    [items]
  )

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !search.trim() ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.name.toLowerCase().includes(search.toLowerCase())
      const matchesType = typeFilter === ALL_TYPES || item.type === typeFilter
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
  }, [
    items,
    search,
    typeFilter,
    statusFilter,
    visibilityFilter,
    categoryFilter,
  ])

  const handleClearFilters = () => {
    setSearch("")
    setTypeFilter(ALL_TYPES)
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
          href={`/dashboard/manage/${row.id}`}
          className="group block min-w-0 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
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
        const Icon = TYPE_ICONS[row.type]
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
            <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            <span>{ARTIFACT_TYPE_LABELS[row.type].singular}</span>
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
          <span className="text-sm text-muted-foreground italic">
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
          <Link href={`/dashboard/manage/${row.id}`}>Manage</Link>
        </Button>
      ),
    },
  ]

  // A type with nothing in it is a different fact from a filter combination
  // that matches nothing, and only one of the two is fixed by clearing
  // filters. Checked against the unfiltered items so a search inside an empty
  // type still reads as "no souls yet" rather than sending the reader to look
  // for a filter that is not the problem.
  const selectedTypeIsEmpty =
    typeFilter !== ALL_TYPES && countsByType[typeFilter] === 0

  const emptyState =
    items.length === 0 ? (
      <EmptyState
        icon={IconSparkles}
        title="Nothing in your catalog yet"
        description="Add your first skill, tool or soul to share it with your organization."
        action={
          <Button asChild className="h-10 rounded-lg">
            <Link href="/dashboard/new-submit">Add an item</Link>
          </Button>
        }
      />
    ) : selectedTypeIsEmpty ? (
      <EmptyState
        icon={TYPE_ICONS[typeFilter]}
        title={`No ${ARTIFACT_TYPE_LABELS[typeFilter].plural.toLowerCase()} yet`}
        description={`Nothing in this workspace is a ${ARTIFACT_TYPE_LABELS[typeFilter].singular.toLowerCase()} yet.`}
        action={
          <Button asChild className="h-10 rounded-lg">
            <Link href={`/dashboard/new-submit?type=${typeFilter}`}>
              Add a {ARTIFACT_TYPE_LABELS[typeFilter].singular.toLowerCase()}
            </Link>
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
        title="Catalog"
        action={
          <Button asChild className="h-10 rounded-lg">
            <Link href="/dashboard/new-submit">
              <IconPlus className="size-4" aria-hidden="true" />
              <span>Add an item</span>
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
          <StatRow columns={STAT_COLUMNS}>
            <StatCard
              label="Total items"
              value={totalCount}
              icon={IconPackage}
              selected={
                !search &&
                typeFilter === ALL_TYPES &&
                statusFilter === "all" &&
                visibilityFilter === "all" &&
                categoryFilter === "all"
              }
              onSelect={handleClearFilters}
            />
            {ARTIFACT_TYPES.map((type) => (
              <StatCard
                key={type}
                label={ARTIFACT_TYPE_LABELS[type].plural}
                value={countsByType[type]}
                icon={TYPE_ICONS[type]}
                selected={typeFilter === type}
                onSelect={() => {
                  setTypeFilter(typeFilter === type ? ALL_TYPES : type)
                }}
              />
            ))}
            <StatCard
              label="Drafts"
              value={draftCount}
              tone="draft"
              icon={IconFilePencil}
              selected={statusFilter === "draft"}
              onSelect={() => {
                setStatusFilter(statusFilter === "draft" ? "all" : "draft")
              }}
            />
          </StatRow>

          {/* 3. Filter Toolbar */}
          <div className="flex items-center gap-2 rounded-xl border border-[var(--ironhub-line)] bg-card p-2 shadow-[var(--ironhub-shadow)] sm:gap-3 sm:p-3">
            <div className="relative min-w-0 flex-1">
              <IconSearch
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name"
                aria-label="Search your catalog"
                className="h-10 rounded-lg pl-9"
              />
            </div>

            <FilterMenu
              activeCount={activeFilterCount}
              onClear={clearFilters}
              className="shrink-0"
            >
              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                Type
                <NativeSelect
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  aria-label="Filter by type"
                  className="w-full"
                  selectClassName="h-10 rounded-lg"
                >
                  <NativeSelectOption value={ALL_TYPES}>
                    All types
                  </NativeSelectOption>
                  {ARTIFACT_TYPES.map((type) => (
                    <NativeSelectOption key={type} value={type}>
                      {ARTIFACT_TYPE_LABELS[type].plural}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                Status
                <NativeSelect
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                  className="w-full"
                  selectClassName="h-10 rounded-lg"
                >
                  <NativeSelectOption value="all">
                    All statuses
                  </NativeSelectOption>
                  <NativeSelectOption value="draft">Drafts</NativeSelectOption>
                  <NativeSelectOption value="published">
                    Published
                  </NativeSelectOption>
                </NativeSelect>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                Visibility
                <NativeSelect
                  value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value)}
                  aria-label="Filter by visibility"
                  className="w-full"
                  selectClassName="h-10 rounded-lg"
                >
                  <NativeSelectOption value="all">
                    All visibilities
                  </NativeSelectOption>
                  <NativeSelectOption value="private">
                    Private
                  </NativeSelectOption>
                  <NativeSelectOption value="public">Public</NativeSelectOption>
                </NativeSelect>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
                Category
                <NativeSelect
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="Filter by category"
                  className="w-full"
                  selectClassName="h-10 rounded-lg"
                >
                  <NativeSelectOption value="all">
                    All categories
                  </NativeSelectOption>
                  <NativeSelectOption value="uncategorised">
                    Uncategorised
                  </NativeSelectOption>
                  {CATEGORIES.map((category) => (
                    <NativeSelectOption key={category} value={category}>
                      {category}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
            </FilterMenu>

            <div className="hidden shrink-0 md:block">
              <ViewToggle
                value={view}
                onChange={handleViewChange}
                options={VIEW_OPTIONS}
                label="View"
              />
            </div>
          </div>

          {/* 4. Table or Cards View */}
          {effectiveView === "table" ? (
            <DataTable<PrivateArtifact>
              columns={columns}
              rows={filteredItems}
              rowKey={(r) => r.id}
              caption="Catalog"
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
                  href={`/dashboard/manage/${item.id}`}
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
