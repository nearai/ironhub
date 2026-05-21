import { Separator } from "@/components/ui/separator"
import { links } from "@/lib/shared/links"

const footerLinks = [
  ["IronClaw", links.ironclaw],
  ["Docs", links.docs],
  ["GitHub", links.repo],
  ["Iliad", links.iliad],
] as const

export function SiteFooter() {
  return (
    <footer className="px-4 pt-10 pb-8 sm:px-6 lg:px-4">
      <div className="mx-auto max-w-7xl">
        <Separator className="mb-5 bg-[var(--ironhub-line)]" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span className="font-heading font-semibold text-foreground">
            IronHub
          </span>
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
    </footer>
  )
}
