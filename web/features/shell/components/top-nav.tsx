"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { isAccountRouteDisabled } from "@/lib/shared/feature-flags"
import { links } from "@/lib/shared/links"
import {
  IconBook,
  IconBulb,
  IconArrowLeft,
  IconClipboardCheck,
  IconLifebuoy,
  IconUser,
} from "@tabler/icons-react"
import { AccountNavButton } from "./account-nav-button"
import { BrandMark } from "./brand-mark"
import { MobileNav } from "./mobile-nav"
import { visibleNavItems } from "./nav-items"
import { isNavItemActive } from "./nav-utils"
import { ThemeToggle } from "./theme-toggle"

export function TopNav() {
  const pathname = usePathname()
  const isMvp = pathname?.startsWith("/mvp")

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ironhub-line)] bg-[var(--ih-nav-bg)] backdrop-blur-xl">
      <div className="ih-container">
        <div className="flex h-16 items-center gap-6">
          <BrandMark />

          <nav className="hidden items-center gap-1 lg:flex">
            {isMvp ? (
              <>
                <Button asChild variant="ghost" size="sm" className="rounded-full">
                  <a href="#docs" onClick={(e) => e.preventDefault()}>
                    <IconBook className="size-4" />
                    Developer Docs
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm" className="rounded-full">
                  <a href="#guidelines" onClick={(e) => e.preventDefault()}>
                    <IconClipboardCheck className="size-4" />
                    Publishing Guidelines
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm" className="rounded-full">
                  <a href="#support" onClick={(e) => e.preventDefault()}>
                    <IconLifebuoy className="size-4" />
                    Support
                  </a>
                </Button>
                <div className="h-4 w-px bg-[var(--ironhub-line)] mx-2" />
                <Button asChild variant="outline" size="sm" className="rounded-full text-muted-foreground hover:text-foreground">
                  <Link href="/marketplace">
                    <IconArrowLeft className="size-4" />
                     Back to Marketplace
                  </Link>
                </Button>
              </>
            ) : (
              visibleNavItems.map(([label, href]) => {
                const isActive = isNavItemActive(pathname, href)

                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive ? "page" : undefined}
                    className={`text-sm font-medium transition-colors ${
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </Link>
                )
              })
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {!isMvp && (
              <>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="hidden gap-1.5 rounded-full sm:inline-flex"
                >
                  <a href={links.suggestFeature} target="_blank" rel="noreferrer">
                    <IconBulb className="size-4" />
                    <span>Suggest Feature</span>
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="hidden gap-1.5 rounded-full border-primary/40 text-primary hover:bg-primary/5 sm:inline-flex"
                >
                  <a
                    href={links.docs}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="IronClaw docs"
                  >
                    <IconBook className="size-4" />
                    <span>Docs</span>
                  </a>
                </Button>
              </>
            )}

            {isMvp && (
              <div className="hidden items-center gap-1.5 rounded-full border border-[var(--ironhub-line)] bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground sm:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Circle Org</span>
                <IconUser className="size-3.5 text-muted-foreground" />
              </div>
            )}

            <ThemeToggle />
            {!isMvp && !isAccountRouteDisabled && <AccountNavButton />}
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  )
}
