import { Card, CardContent } from "@/components/ui/card"

type Metric = {
  label: string
  value: string | number
}

type MetricGridProps = {
  metrics: Metric[]
}

export function MetricGrid({ metrics }: MetricGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="bg-[var(--ih-surface-muted)] backdrop-blur-md border-[var(--ih-border-ui)]" size="sm">
          <CardContent>
            <div className="text-[var(--ih-accent)] text-2xl font-semibold">
              {metric.value}
            </div>
            <div className="text-[var(--ih-ink-soft)] mt-1 text-sm">{metric.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
