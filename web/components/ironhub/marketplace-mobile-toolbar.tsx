"use client"

import { useState } from "react"
import { IconFilter, IconSearch } from "@tabler/icons-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import { MarketplaceSidebar, type MarketplaceSidebarCategory } from "./marketplace-sidebar"

type MarketplaceMobileToolbarProps = {
  categories: MarketplaceSidebarCategory[]
  totalCount: number
}

export function MarketplaceMobileToolbar({
  categories,
  totalCount,
}: MarketplaceMobileToolbarProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.get("q") ?? ""

  function setQuery(q: string) {
    const params = new URLSearchParams(searchParams)
    if (q) {
      params.set("q", q)
    } else {
      params.delete("q")
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <div className="sticky top-[4.5rem] z-30 border-b bg-background/95 px-4 py-2 backdrop-blur-md lg:hidden">
      <div className="flex items-center gap-2">
        <InputGroup className="flex-1 h-11">
          <InputGroupAddon>
            <IconSearch className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search skills and tools..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 rounded-full"
            >
              <IconFilter className="size-4" aria-hidden="true" />
              <span className="sr-only">Categories</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-4">
            <SheetHeader className="px-0 pb-3">
              <SheetTitle>Categories</SheetTitle>
            </SheetHeader>
            <MarketplaceSidebar
              categories={categories}
              totalCount={totalCount}
              onSelect={() => setOpen(false)}
              hideTitle
            />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
