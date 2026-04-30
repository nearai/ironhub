"use client"

import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import type { PlannedTool } from "@/lib/agent-builder-types"

type PlannedToolItemProps = {
  tool: PlannedTool
  checked: boolean
  onToggle: (slug: string) => void
}

export function PlannedToolItem({
  tool,
  checked,
  onToggle,
}: PlannedToolItemProps) {
  return (
    <label className="flex items-start gap-3 rounded-xl border bg-background/40 p-3">
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{tool.name}</span>
          <Badge variant="outline">planned</Badge>
        </span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
          {tool.description}
        </span>
      </span>
      <Switch checked={checked} onCheckedChange={() => onToggle(tool.slug)} />
    </label>
  )
}
