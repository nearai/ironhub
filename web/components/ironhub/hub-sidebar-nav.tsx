"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { isNavItemActive } from "./nav-utils"
import { navItems } from "./nav-items"

export function HubSidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="mt-3 grid gap-1">
      {navItems.map(([label, href, Icon]) => {
        const isActive = isNavItemActive(pathname, href)

        return (
          <Button
            key={href}
            asChild
            variant="ghost"
            className={cn(
              "justify-start",
              isActive &&
                "bg-muted text-foreground ring-1 ring-border hover:bg-muted"
            )}
          >
            <Link href={href} aria-current={isActive ? "page" : undefined}>
              <Icon />
              {label}
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}
