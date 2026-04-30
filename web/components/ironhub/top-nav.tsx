"use client"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { links } from "@/lib/links"
import { IconBrandGithub, IconCommand, IconSearch } from "@tabler/icons-react"
import { BrandMark } from "./brand-mark"
import { MobileNav } from "./mobile-nav"
import { ThemeToggle } from "./theme-toggle"

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/82 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <BrandMark />

        <div className="ml-auto flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="hidden sm:inline-flex"
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

          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
