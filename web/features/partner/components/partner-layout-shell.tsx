"use client"

import { IconMenu2, IconPlus } from "@tabler/icons-react"
import Link from "next/link"
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
import { NotificationBell } from "./notification-bell"
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
        <div className="mx-auto flex max-w-7xl flex-1 items-stretch">
          {/* relative z-30: backdrop-blur creates a stacking context, so the
              sidebar (and the popovers inside it) must sit above <main>. */}
          <aside className="relative z-30 hidden w-64 shrink-0 border-r border-[var(--ironhub-line)] bg-background/40 backdrop-blur-md lg:block">
            <div className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col gap-6 p-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                    Private Space
                  </p>
                  <OrgSwitcher />
                </div>
                <NotificationBell />
              </div>

              <PartnerNav />
              <Button asChild className="w-full rounded-xl shadow-sm bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-200 mt-auto font-semibold shrink-0">
                <Link href="/mvp/new-submit">
                  <IconPlus className="size-4 mr-1.5" />
                  Add Skill / Tool
                </Link>
              </Button>
              <PartnerSupportCard />
            </div>
          </aside>

          <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:p-8">
            <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
              <div className="flex items-center gap-3">
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
                        Private Space
                      </p>
                      <SheetTitle className="text-sm">
                        <OrgSwitcher />
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 flex h-full flex-col gap-6">
                      <PartnerNav onNavigate={() => setMobileNavOpen(false)} />
                      <Button asChild className="w-full rounded-xl shadow-sm bg-primary text-primary-foreground hover:bg-primary/95 transition-all duration-200 mt-auto font-semibold shrink-0">
                        <Link href="/mvp/new-submit" onClick={() => setMobileNavOpen(false)}>
                          <IconPlus className="size-4 mr-1.5" />
                          Add Skill / Tool
                        </Link>
                      </Button>
                      <PartnerSupportCard />
                    </div>
                  </SheetContent>
                </Sheet>
                <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                  Private Space
                </span>
              </div>
              <NotificationBell />
            </div>

            <div className="ih-fade-up max-w-5xl">{children}</div>
          </main>
        </div>
      </ToastProvider>
    </PartnerQueryProvider>
  )
}
