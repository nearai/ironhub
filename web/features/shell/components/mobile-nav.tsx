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

export function MobileNav() {
  const pathname = usePathname()
  const isMvp = pathname?.startsWith("/mvp")

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
            {isMvp
              ? "Manage organization submissions, webhooks, and team access."
              : "Browse secure skills, Wasm tools, docs, and agent loadouts."}
          </SheetDescription>
        </SheetHeader>
        <nav className="grid gap-1 px-3">
          {isMvp ? (
            <>
              <SheetClose asChild>
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/mvp/dashboard">
                    <IconLayoutDashboard className="size-4 mr-2" />
                    Dashboard
                  </Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/mvp/team">
                    <IconUsers className="size-4 mr-2" />
                    Team Members
                  </Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/mvp/settings">
                    <IconSettings className="size-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              </SheetClose>
              <div className="h-px bg-[var(--ironhub-line)] my-2" />
              <SheetClose asChild>
                <Button asChild variant="outline" className="justify-start text-muted-foreground">
                  <Link href="/marketplace">
                    <IconArrowLeft className="size-4 mr-2" />
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
        {!isMvp && (
          <SheetFooter>
            {!isAccountRouteDisabled && (
              <SheetClose asChild>
                <Button asChild variant="outline">
                  <Link href="/account">Account</Link>
                </Button>
              </SheetClose>
            )}
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
                <a href={links.suggestFeature} target="_blank" rel="noreferrer">
                  <IconBulb />
                  Suggest Feature
                </a>
              </Button>
            </SheetClose>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
