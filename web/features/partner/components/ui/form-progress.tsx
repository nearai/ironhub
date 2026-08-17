import * as React from "react"
import { IconCheck } from "@tabler/icons-react"
import { cn } from "@/lib/shared/utils"

export interface FormProgressStep {
  id: string
  label: string
  complete?: boolean
}

export interface FormProgressProps {
  steps: FormProgressStep[]
  currentId: string
  label?: string // aria-label for the nav, default "Form progress"
  className?: string
}

export function FormProgress({
  steps,
  currentId,
  label = "Form progress",
  className,
}: FormProgressProps) {
  const matchIndex = steps.findIndex((step) => step.id === currentId)
  const currentIndex = matchIndex >= 0 ? matchIndex : 0
  const currentStepNumber = steps.length > 0 ? currentIndex + 1 : 0

  return (
    <nav aria-label={label} className={cn("flex flex-col gap-2", className)}>
      <p className="text-xs text-muted-foreground">
        Step {currentStepNumber} of {steps.length}
      </p>

      <ol className="hidden w-full items-center gap-2 sm:flex">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex
          const isComplete =
            !isCurrent && Boolean(step.complete || index < currentIndex)

          return (
            <React.Fragment key={step.id}>
              {index > 0 && (
                <li
                  aria-hidden="true"
                  className="h-px flex-1 bg-[var(--ironhub-line)]"
                />
              )}
              <li
                aria-current={isCurrent ? "step" : undefined}
                className="flex shrink-0 items-center gap-2"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : isComplete
                        ? "border-[var(--ironhub-line)] bg-muted/60 text-muted-foreground"
                        : "border-[var(--ironhub-line)] bg-muted/20 text-muted-foreground"
                  )}
                >
                  {isComplete ? (
                    <IconCheck className="size-3.5" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    isCurrent
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </li>
            </React.Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
