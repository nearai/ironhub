import * as React from "react"
import { cn } from "@/lib/shared/utils"

export interface FormSectionProps {
  title: string
  description?: string
  step?: number
  action?: React.ReactNode
  id?: string
  className?: string
  children: React.ReactNode
}

export function FormSection({
  title,
  description,
  step,
  action,
  id,
  className,
  children,
}: FormSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-xl border border-[var(--ironhub-line)] bg-card p-5 shadow-[var(--ironhub-shadow)] sm:p-6",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {typeof step === "number" && (
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--ironhub-line)] bg-muted text-xs font-semibold tabular-nums text-muted-foreground"
              aria-hidden="true"
            >
              {step}
            </span>
          )}
          <div>
            <h2 className="text-base font-medium text-foreground">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0 sm:self-start">{action}</div>}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  )
}
