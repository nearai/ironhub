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
import { PartnerQueryProvider } from "@/features/partner/api/query-provider"
import { ToastProvider } from "@/features/partner/store/toast-provider"
import { OrgSwitcher } from "./org-switcher"
import { PartnerNav } from "./partner-nav"
import { PartnerSupportCard } from "./partner-support-card"

type PartnerLayoutShellProps = {
  children: React.ReactNode
}

export function PartnerLayoutShell({ children }: PartnerLayoutShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <PartnerQueryProvider>
      <ToastProvider>
        <div className="mx-auto flex min-h-[calc(100vh-4rem-1px)] w-full max-w-[1240px] flex-1 items-stretch px-5 sm:px-8">
          {/* relative z-30: backdrop-blur creates a stacking context, so the
              sidebar (and the popovers inside it) must sit above <main>. */}
          <aside className="relative z-30 hidden w-60 shrink-0 border-r border-[var(--ironhub-line)] lg:block xl:w-64">
            <div className="sticky top-16 flex flex-col gap-6 py-6 pr-6">
              <div>
                <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Private space
                </p>
                <OrgSwitcher className="mt-2 w-full" />
              </div>

              <div className="border-t border-[var(--ironhub-line)]" />

              <PartnerNav />

              <div className="border-t border-[var(--ironhub-line)] pt-4">
                <PartnerSupportCard />
              </div>
            </div>
          </aside>

          <main className="min-w-0 flex-1 pt-6 pb-24 lg:pt-8 lg:pl-8">
            <div className="mb-4 flex items-center gap-3 lg:hidden">
              <div className="flex items-center gap-3">
                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-10 rounded-lg"
                      aria-label="Open partner menu"
                    >
                      <IconMenu2 className="size-4" aria-hidden="true" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    className="flex h-full w-72 flex-col gap-6 overflow-y-auto p-6"
                  >
                    <SheetHeader className="p-0 text-left">
                      <SheetTitle className="sr-only">
                        Private Space Navigation
                      </SheetTitle>
                      <div>
                        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                          Private space
                        </p>
                        <OrgSwitcher className="mt-2 w-full" />
                      </div>
                    </SheetHeader>

                    <div className="border-t border-[var(--ironhub-line)]" />

                    <PartnerNav onNavigate={() => setMobileNavOpen(false)} />

                    <div className="border-t border-[var(--ironhub-line)] pt-4">
                      <PartnerSupportCard />
                    </div>
                  </SheetContent>
                </Sheet>
                <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Private space
                </span>
              </div>
            </div>

            <div className="ih-fade-up">{children}</div>
          </main>
        </div>
      </ToastProvider>
    </PartnerQueryProvider>
  )
}
