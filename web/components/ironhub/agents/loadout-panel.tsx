"use client"

"use client"

import { LoadoutCatalogItem } from "@/components/ironhub/agents/loadout-catalog-item"
import { LoadoutEmptyState } from "@/components/ironhub/agents/loadout-empty-state"
import { LoadoutTitle } from "@/components/ironhub/agents/loadout-title"
import { PlannedToolItem } from "@/components/ironhub/agents/planned-tool-item"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  onBack: () => void
  onContinue: () => void
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
  onBack,
  onContinue,
}: LoadoutPanelProps) {
  return (
    <Card className="bg-card/80">
      <CardHeader className="gap-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Loadout</CardTitle>
            <CardDescription>
              Equip existing repo skills, connected tools, and planned runtime
              surfaces.
            </CardDescription>
          </div>
          <Badge variant="outline">Step 3</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-3">
          <LoadoutTitle title="Skills" count={enabledSkills.length} />
          {skills.map((skill) => (
            <LoadoutCatalogItem
              key={skill.slug}
              item={skill}
              checked={enabledSkills.includes(skill.slug)}
              onToggle={onSkillToggle}
            />
          ))}
          {!skills.length && <LoadoutEmptyState message="No repo skills found." />}
        </div>
        <div className="grid gap-3">
          <LoadoutTitle title="Connected tools" count={enabledTools.length} />
          {tools.map((tool) => (
            <LoadoutCatalogItem
              key={tool.slug}
              item={tool}
              checked={enabledTools.includes(tool.slug)}
              onToggle={onToolToggle}
            />
          ))}
          {!tools.length && <LoadoutEmptyState message="No repo tools found." />}
        </div>
        <div className="grid gap-3">
          <LoadoutTitle title="Planned tools" count={enabledPlannedTools.length} />
          {plannedTools.map((tool) => (
            <PlannedToolItem
              key={tool.slug}
              tool={tool}
              checked={enabledPlannedTools.includes(tool.slug)}
              onToggle={onPlannedToolToggle}
            />
          ))}
        </div>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="button" onClick={onContinue}>
            Review agent
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
