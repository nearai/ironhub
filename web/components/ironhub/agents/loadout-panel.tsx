"use client"

import { LoadoutTitle } from "@/components/ironhub/agents/loadout-title"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import type { PlannedTool } from "@/lib/agent-builder-types"
import type { CatalogItem } from "@/lib/catalog-types"

type LoadoutPanelProps = {
  skills: CatalogItem[]
  tools: CatalogItem[]
  plannedTools: PlannedTool[]
  enabledSkills: string[]
  enabledTools: string[]
  enabledPlannedTools: string[]
  onSkillToggle: (slug: string) => void
  onToolToggle: (slug: string) => void
  onPlannedToolToggle: (slug: string) => void
}

export function LoadoutPanel({
  skills,
  tools,
  plannedTools,
  enabledSkills,
  enabledTools,
  enabledPlannedTools,
  onSkillToggle,
  onToolToggle,
  onPlannedToolToggle,
}: LoadoutPanelProps) {
  return (
    <Card className="bg-card/80">
      <CardHeader>
        <CardTitle>Loadout</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-3">
          <LoadoutTitle title="Skills" count={enabledSkills.length} />
          {skills.map((skill) =>
            renderCatalogItem(skill, enabledSkills, onSkillToggle)
          )}
          {!skills.length && renderEmpty("No repo skills found.")}
        </div>
        <div className="grid gap-3">
          <LoadoutTitle title="Connected tools" count={enabledTools.length} />
          {tools.map((tool) => renderCatalogItem(tool, enabledTools, onToolToggle))}
          {!tools.length && renderEmpty("No repo tools found.")}
        </div>
        <div className="grid gap-3">
          <LoadoutTitle title="Planned tools" count={enabledPlannedTools.length} />
          {plannedTools.map((tool) => {
            const checked = enabledPlannedTools.includes(tool.slug)

            return (
              <label
                key={tool.slug}
                className="flex gap-3 rounded-xl border bg-background/40 p-3"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onPlannedToolToggle(tool.slug)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{tool.name}</span>
                    <Badge variant="outline">planned</Badge>
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                    {tool.description}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function renderCatalogItem(
  item: CatalogItem,
  enabled: string[],
  onToggle: (slug: string) => void
) {
  const checked = enabled.includes(item.slug)

  return (
    <label key={item.slug} className="flex gap-3 rounded-xl border bg-background/40 p-3">
      <Checkbox checked={checked} onCheckedChange={() => onToggle(item.slug)} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{item.name}</span>
          <Badge variant={item.kind === "tool" ? "default" : "secondary"}>
            {item.kind}
          </Badge>
        </span>
        <span className="mt-1 line-clamp-2 block text-sm leading-5 text-muted-foreground">
          {item.description}
        </span>
      </span>
    </label>
  )
}

function renderEmpty(message: string) {
  return (
    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
      {message}
    </div>
  )
}
