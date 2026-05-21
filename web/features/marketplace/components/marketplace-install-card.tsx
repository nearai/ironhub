import { IconSearch } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TerminalBox } from "@/features/marketplace/components/terminal-box"

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
  const installCommand = "ironclaw hub install near-rpc"

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
          className="h-11 bg-background/75 pr-24 pl-9"
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
        {/* <div className="text-sm font-semibold text-muted-foreground">
          IronHub. Versioned, rollback-ready.
        </div> */}
        <TerminalBox copyText={installCommand}>
          <div className="space-y-1 font-mono text-sm">
            <div className="flex gap-3">
              <span className="text-slate-400 select-none dark:text-slate-500">
                $
              </span>
              <span className="text-slate-900 dark:text-slate-100">
                ironclaw hub search near
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 select-none dark:text-slate-500">
                {">"}
              </span>
              <span className="text-slate-400 dark:text-slate-400">
                {total} extensions indexed
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 select-none dark:text-slate-500">
                {">"}
              </span>
              <span className="text-slate-400 dark:text-slate-400">
                {skills} skills / {tools} wasm tools
              </span>
            </div>
            <div className="flex gap-3">
              <span className="text-slate-400 select-none dark:text-slate-500">
                $
              </span>
              <span className="text-slate-900 dark:text-slate-100">
                {installCommand}
              </span>
            </div>
          </div>
        </TerminalBox>
      </div>
    </div>
  )
}
