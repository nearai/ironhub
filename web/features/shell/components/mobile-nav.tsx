"use client"

import {
  IconBook,
  IconBulb,
  IconMenu2,
  IconPlus,
  IconLayoutDashboard,
  IconUsers,
  IconSettings,
  IconArrowLeft,
} from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { isAccountRouteDisabled } from "@/lib/shared/feature-flags"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { links } from "@/lib/shared/links"
import { BrandMark } from "./brand-mark"
import { visibleNavItems } from "./nav-items"
import { isWorkspaceRoute } from "./nav-utils"

export function MobileNav() {
  const pathname = usePathname()
  const isWorkspace = isWorkspaceRoute(pathname)

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden"
          aria-label="Open navigation menu"
        >
          <IconMenu2 />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[19rem]">
        <SheetHeader>
          <BrandMark />
          <SheetTitle className="sr-only">IronHub navigation</SheetTitle>
          <SheetDescription>
            {isWorkspace
              ? "Manage your organization's catalog, members, and settings."
              : "Browse IronClaw extensions, tools, docs, and agent loadouts."}
          </SheetDescription>
        </SheetHeader>
        <nav className="grid gap-1 px-3">
          {isWorkspace ? (
            <>
              <SheetClose asChild>
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/dashboard/catalog">
                    <IconLayoutDashboard className="mr-2 size-4" />
                    Catalog
                  </Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/dashboard/team">
                    <IconUsers className="mr-2 size-4" />
                    Members
                  </Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/dashboard/settings">
                    <IconSettings className="mr-2 size-4" />
                    Settings
                  </Link>
                </Button>
              </SheetClose>
              <div className="my-2 h-px bg-[var(--ironhub-line)]" />
              <SheetClose asChild>
                <Button
                  asChild
                  variant="outline"
                  className="justify-start text-muted-foreground"
                >
                  <Link href="/marketplace">
                    <IconArrowLeft className="mr-2 size-4" />
                    Back to Marketplace
                  </Link>
                </Button>
              </SheetClose>
            </>
          ) : (
            visibleNavItems.map(([label, href, Icon]) => (
              <SheetClose key={href} asChild>
                <Button asChild variant="ghost" className="justify-start">
                  <Link href={href}>
                    <Icon />
                    {label}
                  </Link>
                </Button>
              </SheetClose>
            ))
          )}
        </nav>
        {/* The account entry no longer depends on isWorkspace (it used to
            hide here on workspace routes, leaving a member with no route to
            their account from the mobile menu). The marketing CTAs below it
            still only make sense outside the workspace. */}
        <SheetFooter>
          {!isAccountRouteDisabled && (
            <SheetClose asChild>
              <Button asChild variant="outline">
                <Link href="/account">Account</Link>
              </Button>
            </SheetClose>
          )}
          {!isWorkspace && (
            <>
              <SheetClose asChild>
                <Button asChild>
                  <a href={links.newSkill} target="_blank" rel="noreferrer">
                    <IconPlus />
                    Create Skill
                  </a>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button asChild variant="outline">
                  <a href={links.docs} target="_blank" rel="noreferrer">
                    <IconBook />
                    Docs
                  </a>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button asChild variant="outline">
                  <a
                    href={links.suggestFeature}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <IconBulb />
                    Suggest Feature
                  </a>
                </Button>
              </SheetClose>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
