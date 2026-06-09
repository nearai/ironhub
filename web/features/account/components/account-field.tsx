import type { ReactNode } from "react"

import { cn } from "@/lib/shared/utils"

type AccountFieldProps = {
  label: string
  value?: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}

export function AccountField({
  action,
  children,
  className,
  label,
  value,
}: AccountFieldProps) {
  return (
    <div
      className={cn(
        "grid min-h-12 items-center gap-2 rounded-xl border border-[var(--ironhub-line)] bg-background/45 px-3 py-2 sm:grid-cols-[10rem_minmax(0,1fr)_auto]",
        className
      )}
    >
      <span className="text-xs font-medium tracking-normal text-muted-foreground uppercase">
        {label}
      </span>
      <div className="min-w-0 text-sm break-all text-foreground">
        {children ?? value}
      </div>
      {action ? <div className="justify-self-end">{action}</div> : null}
    </div>
  )
}
