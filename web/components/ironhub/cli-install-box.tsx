"use client"

import { IconCheck, IconCopy, IconTerminal2 } from "@tabler/icons-react"
import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"

type CLIInstallBoxProps = {
  slug: string
}

export function CLIInstallBox({ slug }: CLIInstallBoxProps) {
  const [copied, setCopied] = useState(false)
  const command = `ironclaw hub install ${slug}`

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy!", err)
    }
  }, [command])

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-slate-900 shadow-sm transition-all dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:shadow-inner">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400">
        <span className="inline-flex items-center gap-2">
          <IconTerminal2 className="size-3.5 text-sky-500 dark:text-sky-400/80" />
          ironhub
        </span>
        <button
          onClick={handleCopy}
          className="hover:text-slate-900 transition-colors dark:hover:text-slate-100"
          aria-label="Copy install command"
        >
          {copied ? (
            <IconCheck className="size-3.5 text-emerald-500 dark:text-emerald-400" />
          ) : (
            <IconCopy className="size-3.5" />
          )}
        </button>
      </div>
      <div className="flex items-center gap-3 px-4 py-3 font-mono text-[0.875rem] leading-relaxed">
        <span className="text-slate-400 select-none dark:text-slate-500">$</span>
        <code className="text-slate-900 break-all dark:text-slate-100">
          {command}
        </code>
      </div>
    </div>
  )
}
