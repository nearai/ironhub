"use client"

import {
  IconLayoutDashboard,
  IconSettings,
  IconSparkles,
  IconTool,
  IconUserHeart,
  IconUsers,
} from "@tabler/icons-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { workspaceLinkTone } from "@/features/partner/components/ui"
import {
  ARTIFACT_TYPES,
  ARTIFACT_TYPE_LABELS,
  type ArtifactType,
} from "@/lib/private-artifacts/artifact-types"
import { cn } from "@/lib/shared/utils"

const CATALOG_HREF = "/dashboard/catalog"

const menuItems = [
  { label: "Catalog", href: CATALOG_HREF, icon: IconLayoutDashboard },
  { label: "Members", href: "/dashboard/team", icon: IconUsers },
  { label: "Settings", href: "/dashboard/settings", icon: IconSettings },
]

const TYPE_ICONS: Record<
  ArtifactType,
  React.ComponentType<{ className?: string }>
> = {
  skill: IconSparkles,
  tool: IconTool,
  soul: IconUserHeart,
}

// Derived from the supported-type tuple rather than written out, so a type the
// hub starts accepting is navigable the moment it is accepted. The alternative
// is a second list to remember, and the one thing certain about a second list
// is which of the two gets updated (design.md -- "Type sub-items are derived
// from the supported type list, not hand-written").
const catalogTypeItems = ARTIFACT_TYPES.map((type) => ({
  type,
  label: ARTIFACT_TYPE_LABELS[type].plural,
  href: `${CATALOG_HREF}?type=${type}`,
  icon: TYPE_ICONS[type],
}))

type PartnerNavProps = {
  onNavigate?: () => void
}

export function PartnerNav({ onNavigate }: PartnerNavProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // The catalog page reads the same parameter, so what the navigation marks
  // active and what the list actually shows cannot disagree.
  const activeType = searchParams.get("type")

  return (
    <nav className="flex flex-col gap-1.5">
      {menuItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href === CATALOG_HREF &&
            (pathname.startsWith("/dashboard/manage") ||
              pathname.startsWith("/dashboard/edit-")))
        const Icon = item.icon

        return (
          <div key={item.href} className="flex flex-col gap-1.5">
            <Button
              asChild
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "h-10 w-full justify-start rounded-lg px-3 text-sm font-medium transition-colors",
                isActive
                  ? cn(
                      "bg-primary/10 hover:bg-primary/15",
                      workspaceLinkTone,
                      "hover:text-near-cobalt dark:hover:text-primary"
                    )
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <Link href={item.href} onClick={onNavigate}>
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            </Button>

            {item.href === CATALOG_HREF && (
              <ul className="ml-4 flex flex-col gap-0.5 border-l border-[var(--ironhub-line)] pl-2">
                {catalogTypeItems.map((typeItem) => {
                  // A sub-item is active only on the catalog list itself: an
                  // item's manage page keeps Catalog lit above, but it is not
                  // a filtered list and marking one of these would claim a
                  // selection the reader never made.
                  const isTypeActive =
                    pathname === CATALOG_HREF && activeType === typeItem.type

                  const TypeIcon = typeItem.icon

                  return (
                    <li key={typeItem.type}>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-9 w-full justify-start rounded-lg px-3 text-sm font-normal transition-colors",
                          isTypeActive
                            ? cn(
                                "bg-primary/10 hover:bg-primary/15",
                                workspaceLinkTone,
                                "hover:text-near-cobalt dark:hover:text-primary"
                              )
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        )}
                      >
                        <Link
                          href={typeItem.href}
                          onClick={onNavigate}
                          aria-current={isTypeActive ? "page" : undefined}
                        >
                          <TypeIcon
                            className={cn(
                              "size-4 shrink-0",
                              isTypeActive ? "text-primary" : "text-muted-foreground"
                            )}
                            aria-hidden="true"
                          />
                          <span>{typeItem.label}</span>
                        </Link>
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}
