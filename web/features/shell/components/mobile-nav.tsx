"use client"

import { IconBook, IconBulb, IconMenu2, IconPlus } from "@tabler/icons-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
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
import { navItems } from "./nav-items"

export function MobileNav() {
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
            Browse secure skills, Wasm tools, docs, and agent loadouts.
          </SheetDescription>
        </SheetHeader>
        <nav className="grid gap-1 px-3">
          {navItems.map(([label, href, Icon]) => (
            <SheetClose key={href} asChild>
              <Button asChild variant="ghost" className="justify-start">
                <Link href={href}>
                  <Icon />
                  {label}
                </Link>
              </Button>
            </SheetClose>
          ))}
        </nav>
        <SheetFooter>
          <SheetClose asChild>
            <Button asChild variant="outline">
              <Link href="/account">Account</Link>
            </Button>
          </SheetClose>
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
      </SheetContent>
    </Sheet>
  )
}
