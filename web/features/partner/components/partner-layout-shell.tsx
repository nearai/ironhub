"use client"

import { PartnerQueryProvider } from "@/features/partner/api/query-provider"
import { OrgSwitcher } from "./org-switcher"
import { PartnerNav } from "./partner-nav"

type PartnerLayoutShellProps = {
  children: React.ReactNode
}

export function PartnerLayoutShell({ children }: PartnerLayoutShellProps) {
  return (
    <PartnerQueryProvider>
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
          </div>
        </aside>

        <main className="min-w-0 flex-1 pt-6 pb-24 lg:pt-8 lg:pl-8">
          <div className="mb-4 flex items-center gap-3 lg:hidden">
            {/* design D8: below `lg` the sidebar (and its org switcher) is
                hidden, so this row is the only place a member on a phone can
                see or change the active organization -- a static caption
                does not belong here. The site header's own hamburger
                (MobileNav) already covers Catalog/Members/Settings on
                workspace routes, so this row no longer needs a second
                trigger of its own -- the switcher takes the full row. */}
            <OrgSwitcher className="min-w-0 flex-1" />
          </div>

          <div className="ih-fade-up">{children}</div>
        </main>
      </div>
    </PartnerQueryProvider>
  )
}
