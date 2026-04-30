import { Suspense } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { CatalogItem } from "@/lib/catalog-types"
import { links } from "@/lib/links"
import { HubSidebarCategories } from "./hub-sidebar-categories"
import { HubSidebarNav } from "./hub-sidebar-nav"

type HubSidebarProps = {
  items: CatalogItem[]
  categories: string[]
}

export function HubSidebar({ items, categories }: HubSidebarProps) {
  return (
    <aside className="sticky top-16 hidden h-[calc(100svh-4rem)] w-72 shrink-0 flex-col overflow-y-auto border-r p-5 lg:flex">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase">
          Discover
        </p>
        <HubSidebarNav />
        <Separator className="my-6" />
        <p className="text-xs font-semibold text-muted-foreground uppercase">
          Categories
        </p>
        <Suspense fallback={null}>
          <HubSidebarCategories
            categories={categories.map((category) => ({
              name: category,
              count: items.filter((item) => item.category === category).length,
            }))}
          />
        </Suspense>
      </div>
      <div className="mt-auto pt-6">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Create & Share</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Propose a new skill branch from a real tool trunk.
            </p>
            <Button asChild>
              <a href={links.newSkill} target="_blank" rel="noreferrer">
                Create Skill
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </aside>
  )
}
