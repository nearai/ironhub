"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { links } from "@/lib/shared/links"
import { BrandMark } from "./brand-mark"

const footerLinks = [
  ["IronClaw", links.ironclaw],
  ["Docs", links.docs],
  ["GitHub", links.repo],
  ["Iliad", links.iliad],
] as const

export function SiteFooter() {
  const pathname = usePathname()

  if (pathname?.startsWith("/mvp")) {
    return null
  }

  return (
    <footer className="pt-10 pb-8">
      <div className="ih-container">
        <Separator className="mb-6 bg-[var(--ironhub-line)]" />
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-sm text-muted-foreground">
          <BrandMark />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {footerLinks.map(([label, href]) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-primary"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
