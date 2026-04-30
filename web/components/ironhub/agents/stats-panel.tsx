import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { AgentStats } from "@/lib/agent-builder-types"

type StatsPanelProps = {
  stats: AgentStats
}

export function StatsPanel({ stats }: StatsPanelProps) {
  const rows = [
    ["Autonomy", stats.autonomy, "How far the agent can proceed before stopping."],
    ["Security", stats.security, "Privacy and approval controls in the soul."],
    ["Memory", stats.memory, "Configured continuity across work sessions."],
    ["Tool Power", stats.toolPower, "Enabled skills, real tools, and planned surfaces."],
    ["Chain Access", stats.chainAccess, "NEAR RPC and transaction-boundary readiness."],
  ] as const

  return (
    <Card className="bg-card/75">
      <CardHeader>
        <CardTitle>Capability matrix</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {rows.map(([label, value, description]) => (
          <div key={label} className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">{description}</div>
              </div>
              <div className="text-lg font-semibold text-primary">{value}</div>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
