"use client"

import { TerminalBox } from "@/features/marketplace/components/terminal-box"

type CLIInstallBoxProps = {
  slug: string
}

export function CLIInstallBox({ slug }: CLIInstallBoxProps) {
  const command = `ironclaw hub install ${slug}`

  return (
    <TerminalBox copyText={command}>
      <div className="flex gap-3 font-mono text-sm">
        <span className="text-slate-400 select-none dark:text-slate-500">
          $
        </span>
        <span className="break-all text-slate-900 dark:text-slate-100">
          {command}
        </span>
      </div>
    </TerminalBox>
  )
}
