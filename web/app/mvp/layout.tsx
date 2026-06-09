"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PartnerProvider } from "@/features/partner/store/partner-store"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  IconLayoutDashboard,
  IconUsers,
  IconSettings,
  IconMenu2,
} from "@tabler/icons-react"
import { cn } from "@/lib/shared/utils"

const MENU_ITEMS = [
  { label: "Dashboard", href: "/mvp/dashboard", icon: IconLayoutDashboard },
  { label: "Team Members", href: "/mvp/team", icon: IconUsers },
  { label: "Settings", href: "/mvp/settings", icon: IconSettings },
]

function PartnerNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1.5">
      {MENU_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href === "/mvp/dashboard" && pathname.startsWith("/mvp/manage"))
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
                ? "bg-primary/8 text-primary font-semibold border-l-2 border-primary pl-2.5"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            <Link href={item.href} onClick={onNavigate}>
              <Icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
              {item.label}
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}

function SupportCard() {
  return (
    <div className="mt-auto rounded-2xl border border-[var(--ironhub-line)] bg-muted/20 p-4 text-[11px] text-muted-foreground">
      <span className="font-semibold text-foreground">Need Assistance?</span>
      <p className="mt-1">
        Reach out to Near AI developer relations at{" "}
        <a
          href="mailto:devs@near.ai"
          className="font-medium text-primary hover:underline"
        >
          devs@near.ai
        </a>
      </p>
    </div>
  )
}

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <PartnerProvider>
      <div className="mx-auto flex max-w-7xl flex-1 items-stretch">
        {/* Persistent Desktop Left Sidebar */}
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
            <SupportCard />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:p-8">
          {/* Mobile portal nav trigger */}
          <div className="mb-4 flex items-center gap-3 lg:hidden">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full" aria-label="Open partner menu">
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
                  <SupportCard />
                </div>
              </SheetContent>
            </Sheet>
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              Partner Portal
            </span>
          </div>

          <div className="ih-fade-up max-w-5xl">
            {children}
          </div>
        </main>
      </div>
    </PartnerProvider>
  )
}
