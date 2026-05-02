"use client"

import type { BuilderStep } from "@/lib/agent-builder-types"
import { cn } from "@/lib/utils"
import {
  IconBoxSeam,
  IconCircleCheck,
  IconFileExport,
  IconSparkles,
  IconUserBolt,
} from "@tabler/icons-react"

type BuilderStepNavProps = {
  activeStep: BuilderStep
  onStepChange: (step: BuilderStep) => void
}

const steps = [
  {
    key: "persona",
    label: "Persona",
    description: "Pick the starting agent type",
    icon: IconUserBolt,
  },
  {
    key: "soul",
    label: "Soul",
    description: "Set identity and guardrails",
    icon: IconSparkles,
  },
  {
    key: "loadout",
    label: "Loadout",
    description: "Enable Skills and Tools",
    icon: IconBoxSeam,
  },
  {
    key: "review",
    label: "Review",
    description: "Check and export config",
    icon: IconFileExport,
  },
] satisfies Array<{
  key: BuilderStep
  label: string
  description: string
  icon: typeof IconCircleCheck
}>

export function BuilderStepNav({
  activeStep,
  onStepChange,
}: BuilderStepNavProps) {
  const activeIndex = steps.findIndex((step) => step.key === activeStep)

  return (
    <nav className="grid gap-2 rounded-2xl sm:grid-cols-4">
      {steps.map((step, index) => {
        const Icon = step.icon
        const selected = step.key === activeStep
        const complete = index < activeIndex

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => onStepChange(step.key)}
            className={cn(
              "flex min-h-16 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
              selected
                ? "border-primary bg-primary/10 text-foreground"
                : "border-transparent hover:border-border hover:bg-background/50"
            )}
          >
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-lg border",
                selected
                  ? "border-primary/40 bg-primary text-primary-foreground"
                  : "border-border bg-background/60 text-muted-foreground"
              )}
            >
              {complete ? <IconCircleCheck /> : <Icon />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{step.label}</span>
              <span className="line-clamp-1 block text-xs text-muted-foreground">
                {step.description}
              </span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}
