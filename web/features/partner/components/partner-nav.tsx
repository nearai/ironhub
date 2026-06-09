"use client"

import {
  IconLayoutDashboard,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/shared/utils"

const menuItems = [
  { label: "Dashboard", href: "/mvp/dashboard", icon: IconLayoutDashboard },
  { label: "Team Members", href: "/mvp/team", icon: IconUsers },
  { label: "Settings", href: "/mvp/settings", icon: IconSettings },
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
          (item.href === "/mvp/dashboard" &&
            pathname.startsWith("/mvp/manage"))
        const Icon = item.icon

        return (
          <Button
            key={item.href}
            asChild
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "justify-start rounded-xl px-3 py-5 transition-all duration-200",
              isActive
                ? "bg-primary/8 border-l-2 border-primary pl-2.5 font-semibold text-primary"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            <Link href={item.href} onClick={onNavigate}>
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              />
              {item.label}
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}
