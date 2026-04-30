"use client"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { AgentMode, AgentModePreset } from "@/lib/agent-builder-types"
import { cn } from "@/lib/utils"

type ModeSelectorProps = {
  mode: AgentMode
  presets: AgentModePreset[]
  onModeChange: (mode: AgentMode) => void
}

export function ModeSelector({
  mode,
  presets,
  onModeChange,
}: ModeSelectorProps) {
  return (
    <Card className="bg-card/80">
      <CardHeader>
        <CardTitle>Agent mode</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {presets.map((preset) => {
          const selected = mode === preset.mode

          return (
            <button
              key={preset.mode}
              type="button"
              onClick={() => onModeChange(preset.mode)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                "hover:border-primary/60 hover:bg-primary/5",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background/40"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{preset.label}</span>
                <Badge variant={selected ? "default" : "outline"}>
                  {preset.badge}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                {preset.description}
              </p>
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}
