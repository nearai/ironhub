"use client"

import { IconCheck, IconCopy, IconTerminal2 } from "@tabler/icons-react"
import { useState, useCallback } from "react"
import { cn } from "@/lib/shared/utils"

type TerminalBoxProps = {
  title?: string
  copyText?: string
  children: React.ReactNode
  className?: string
}

export function TerminalBox({
  title = "Install",
  copyText,
  children,
  className,
}: TerminalBoxProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!copyText) return
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy!", err)
    }
  }, [copyText])

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-slate-900 shadow-sm transition-all dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:shadow-inner",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2 text-xs font-medium text-slate-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400">
        <span className="inline-flex items-center gap-2">
          <IconTerminal2 className="size-3.5 text-sky-500 dark:text-sky-400/80" />
          {title}
        </span>
        {copyText && (
          <button
            onClick={handleCopy}
            className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
            aria-label="Copy to clipboard"
          >
            {copied ? (
              <IconCheck className="size-3.5 text-emerald-500 dark:text-emerald-400" />
            ) : (
              <IconCopy className="size-3.5" />
            )}
          </button>
        )}
      </div>
      <div className="overflow-x-auto p-4 font-mono text-sm leading-relaxed">
        {children}
      </div>
    </div>
  )
}
