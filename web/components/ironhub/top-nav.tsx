"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { links } from "@/lib/links"
import { IconBook, IconBrandGithub, IconExternalLink } from "@tabler/icons-react"
import { BrandMark } from "./brand-mark"
import { MobileNav } from "./mobile-nav"
import { navItems } from "./nav-items"
import { isNavItemActive } from "./nav-utils"
import { ThemeToggle } from "./theme-toggle"

export function TopNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ironhub-line)] bg-background/82 shadow-[0_2px_24px_rgb(43_130_212_/_0.1)] backdrop-blur-xl">
      <div className="px-4 sm:px-6 lg:px-0">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4">
          <BrandMark />

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map(([label, href, Icon]) => {
              const isActive = isNavItemActive(pathname, href)

              return (
                <Button
                  key={href}
                  asChild
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className="rounded-full"
                >
                  <Link href={href} aria-current={isActive ? "page" : undefined}>
                    <Icon />
                    {label}
                  </Link>
                </Button>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              size="icon"
              className="hidden rounded-full sm:inline-flex"
            >
              <a
                href={links.repo}
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub repository"
              >
                <IconBrandGithub />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="icon"
              className="hidden rounded-full sm:inline-flex"
            >
              <a
                href={links.docs}
                target="_blank"
                rel="noreferrer"
                aria-label="IronClaw docs"
              >
                <IconBook />
              </a>
            </Button>

            <ThemeToggle />
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  )
}
