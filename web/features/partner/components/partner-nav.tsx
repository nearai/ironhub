"use client"

import {
  IconLayoutDashboard,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { workspaceLinkTone } from "@/features/partner/components/ui"
import { cn } from "@/lib/shared/utils"

const menuItems = [
  { label: "Catalog", href: "/dashboard/catalog", icon: IconLayoutDashboard },
  { label: "Members", href: "/dashboard/team", icon: IconUsers },
  { label: "Settings", href: "/dashboard/settings", icon: IconSettings },
]

type PartnerNavProps = {
  onNavigate?: () => void
}

export function PartnerNav({ onNavigate }: PartnerNavProps) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1.5">
      {menuItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href === "/dashboard/catalog" &&
            (pathname.startsWith("/dashboard/manage") ||
              pathname.startsWith("/dashboard/edit-")))
        const Icon = item.icon

        return (
          <Button
            key={item.href}
            asChild
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-10 w-full justify-start rounded-lg px-3 text-sm font-medium transition-colors",
              isActive
                ? cn(
                    "bg-primary/10 hover:bg-primary/15",
                    workspaceLinkTone,
                    "hover:text-near-cobalt dark:hover:text-primary"
                  )
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            <Link href={item.href} onClick={onNavigate}>
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span>{item.label}</span>
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}
