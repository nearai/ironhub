"use client"

import { Suspense } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconBook,
  IconBulb,
  IconArrowLeft,
  IconClipboardCheck,
  IconLifebuoy,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { WorkspaceHeaderActions } from "@/features/partner/components/workspace-header-actions"
import { authClient } from "@/lib/auth/client"
import { links } from "@/lib/shared/links"
import { BrandMark } from "./brand-mark"
import { MobileNav } from "./mobile-nav"
import { visibleNavItems } from "./nav-items"
import { isNavItemActive, isWorkspaceRoute } from "./nav-utils"
import { ThemeToggle } from "./theme-toggle"
import { UserMenu } from "./user-menu"

export function TopNav() {
  const pathname = usePathname()
  const isWorkspace = isWorkspaceRoute(pathname)
  const { data: session } = authClient.useSession()

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ironhub-line)] bg-[var(--ih-nav-bg)] backdrop-blur-xl">
      <div className="ih-container">
        <div className="flex h-16 items-center gap-6">
          <BrandMark />

          <nav className="hidden items-center gap-7 lg:flex">
            {isWorkspace ? (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                >
                  <a href="#docs" onClick={(e) => e.preventDefault()}>
                    <IconBook className="size-4" />
                    Developer Docs
                  </a>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                >
                  <a href="#guidelines" onClick={(e) => e.preventDefault()}>
                    <IconClipboardCheck className="size-4" />
                    Publishing Guidelines
                  </a>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                >
                  <a href="#support" onClick={(e) => e.preventDefault()}>
                    <IconLifebuoy className="size-4" />
                    Support
                  </a>
                </Button>
                <div className="mx-2 h-4 w-px bg-[var(--ironhub-line)]" />
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full text-muted-foreground hover:text-foreground"
                >
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
            {/* "Docs" (outline button, links.docs) removed from this row
                per user request -- Suggest Feature stays, the mobile nav
                footer's own Docs entry stays, and the three workspace-only
                links above (Developer Docs / Publishing Guidelines /
                Support) stay: those are still deliberately kept. */}
            {!isWorkspace && (
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
            )}

            {/* design D5: one control cluster (bell + theme + account),
                the same on every route for a signed-in member -- no more
                branching on isWorkspace to decide what the header offers. */}
            {/* Symmetric rounding: button-group.tsx's own horizontal variant
                only forces the *last* control to the full `rounded-r-4xl!`
                pill radius (so it reads as one capsule on the right); the
                first control was left with its own component's radius
                (`rounded-lg`), producing a squared-off left end. Matching
                the same radius on the left is applied here, at the call
                site, rather than in the shared primitive -- other surfaces
                (catalog view toggle, catalog kind tabs, the agent builder's
                selection drawer) also consume `ButtonGroup` and should not
                pick up this cluster's rounding by editing button-group.tsx
                itself. Which control renders first varies (the bell is
                session-gated), so this targets `:first-child` rather than a
                specific control. */}
            <ButtonGroup className="[&>*:first-child]:rounded-l-4xl!">
              {session && <WorkspaceHeaderActions />}
              <ThemeToggle />
              {/* useAccountActions (inside UserMenu) reads useSearchParams,
                  which would otherwise force this whole tree -- mounted in
                  the root layout, on every route -- out of static rendering.
                  The Suspense boundary contains that to just this control. */}
              <Suspense
                fallback={
                  <Button
                    variant="outline"
                    size="icon-lg"
                    disabled
                    aria-hidden="true"
                    className="rounded-lg"
                  />
                }
              >
                <UserMenu />
              </Suspense>
            </ButtonGroup>
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  )
}
