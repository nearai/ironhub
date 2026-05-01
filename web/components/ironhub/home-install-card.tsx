import { IconCopy, IconTerminal2 } from "@tabler/icons-react"

type HomeInstallCardProps = {
  total: number
  skills: number
  tools: number
}

export function HomeInstallCard({
  total,
  skills,
  tools,
}: HomeInstallCardProps) {
  return (
    <div className="rounded-xl border border-[var(--ironhub-line)] bg-card/90 p-6 shadow-[var(--ironhub-shadow)] backdrop-blur-xl">
      <div className="grid gap-3">
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
