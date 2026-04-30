"use client"

import { Button } from "@/components/ui/button"
import type { AgentModePreset } from "@/lib/agent-builder-types"
import { IconInfoCircle } from "@tabler/icons-react"

type SelectedPersonaSummaryProps = {
  preset: AgentModePreset
  onContinue: () => void
}

export function SelectedPersonaSummary({
  preset,
  onContinue,
}: SelectedPersonaSummaryProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card/80 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-primary/10 text-primary">
          <IconInfoCircle className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-medium">All personas are fully configurable.</p>
          <p className="text-sm leading-6 text-muted-foreground">
            {preset.label} starts with a tuned soul, loadout, and approval
            policy. You can change everything after selection.
          </p>
        </div>
      </div>
      <Button type="button" onClick={onContinue} className="shrink-0">
        Configure soul
      </Button>
    </div>
  )
}
