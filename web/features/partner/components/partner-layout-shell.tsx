"use client"

import { IconMenu2 } from "@tabler/icons-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { PartnerProvider } from "@/features/partner/store/partner-store"
import { PartnerNav } from "./partner-nav"
import { PartnerSupportCard } from "./partner-support-card"

type PartnerLayoutShellProps = {
  children: React.ReactNode
}

export function PartnerLayoutShell({ children }: PartnerLayoutShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <PartnerProvider>
      <div className="mx-auto flex max-w-7xl flex-1 items-stretch">
        <aside className="hidden w-64 shrink-0 border-r border-[var(--ironhub-line)] bg-background/40 backdrop-blur-md lg:block">
          <div className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col gap-6 p-6">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                Partner Portal
              </p>
              <h2 className="mt-1 text-sm font-semibold text-foreground">
                Circle Org Space
              </h2>
            </div>

            <PartnerNav />
            <PartnerSupportCard />
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:p-8">
          <div className="mb-4 flex items-center gap-3 lg:hidden">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  aria-label="Open partner menu"
                >
                  <IconMenu2 className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-6">
                <SheetHeader className="p-0">
                  <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                    Partner Portal
                  </p>
                  <SheetTitle className="text-sm">Circle Org Space</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex h-full flex-col gap-6">
                  <PartnerNav onNavigate={() => setMobileNavOpen(false)} />
                  <PartnerSupportCard />
                </div>
              </SheetContent>
            </Sheet>
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              Partner Portal
            </span>
          </div>

          <div className="ih-fade-up max-w-5xl">{children}</div>
        </main>
      </div>
    </PartnerProvider>
  )
}
