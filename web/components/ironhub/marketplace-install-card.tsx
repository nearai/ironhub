import { IconCopy, IconSearch, IconTerminal2 } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type MarketplaceInstallCardProps = {
  total: number
  skills: number
  tools: number
}

export function MarketplaceInstallCard({
  total,
  skills,
  tools,
}: MarketplaceInstallCardProps) {
  return (
    <div className="rounded-xl border border-[var(--ih-line)] bg-[var(--ih-surface-muted)] p-6 shadow-[var(--ih-shadow)] backdrop-blur-xl">
      <form action="/marketplace" className="relative" role="search">
        <IconSearch
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          name="q"
          type="search"
          placeholder="Search skills, tools, or workflows"
          className="h-11 bg-background/75 pl-9 pr-24"
        />
        <Button
          type="submit"
          size="sm"
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-full"
        >
          Search
        </Button>
      </form>

      <div className="mt-5 grid gap-3">
        <div className="text-sm font-semibold text-muted-foreground">
          IronHub. Versioned, rollback-ready.
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-900/20 bg-slate-950 text-slate-100 shadow-inner dark:border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-2">
              <IconTerminal2 className="size-3.5 text-sky-300" />
              ironhub
            </span>
            <IconCopy className="size-3.5" aria-hidden="true" />
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-sm leading-7">
            <code>{`$ ironclaw hub search near
> ${total} extensions indexed
> ${skills} skills / ${tools} wasm tools
$ ironclaw hub install near-rpc`}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
