"use client"

import { useState } from "react"
import { Filter } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import { HomeSidebar, type HomeSidebarCategory } from "./home-sidebar"

type HomeMobileToolbarProps = {
  categories: HomeSidebarCategory[]
  totalCount: number
}

export function HomeMobileToolbar({
  categories,
  totalCount,
}: HomeMobileToolbarProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="sticky top-[4.5rem] z-30 border-b bg-background/95 px-4 py-2 backdrop-blur-md lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <Filter className="size-4" aria-hidden="true" />
            Categories
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-4">
          <SheetHeader className="px-0 pb-3">
            <SheetTitle>Categories</SheetTitle>
          </SheetHeader>
          <HomeSidebar
            categories={categories}
            totalCount={totalCount}
            onSelect={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
