import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { AgentStats } from "@/lib/agent-builder-types"
import { statRows } from "@/lib/agent-builder-utils"

type StatsPanelProps = {
  stats: AgentStats
}

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <Card className="bg-card/75">
      <CardHeader>
        <CardTitle>Capability matrix</CardTitle>
        <CardDescription>
          A quick read on the agent's operating shape before export.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {statRows(stats).map((row) => (
          <div key={row.label} className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{row.label}</div>
                <div className="text-xs text-muted-foreground">
                  {descriptions[row.label]}
                </div>
              </div>
              <div className="text-lg font-semibold text-primary">
                {row.value}
              </div>
            </div>
            <Progress value={row.value} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

const descriptions: Record<string, string> = {
  Autonomy: "How far the agent can proceed before stopping.",
  Security: "Privacy and approval controls in the soul.",
  Memory: "Configured continuity across work sessions.",
  "Tool power": "Enabled skills, real tools, and planned surfaces.",
  "Chain access": "NEAR RPC and transaction-boundary readiness.",
}
