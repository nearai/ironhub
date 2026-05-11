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
    <div className="grid grid-cols-2 gap-1.5 sm:gap-3 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="bg-[var(--ih-surface-muted)] backdrop-blur-md border-[var(--ih-border-ui)] py-1.5 sm:py-4 px-2 sm:px-4" size="sm">
          <div className="flex sm:flex-col items-baseline sm:items-start gap-1.5 sm:gap-1 px-1 sm:px-4">
            <span className="text-[var(--ih-accent)] text-sm sm:text-2xl font-bold sm:font-semibold leading-none">
              {metric.value}
            </span>
            <span className="text-[var(--ih-ink-soft)] text-[10px] sm:text-sm font-medium leading-none">
              {metric.label}
            </span>
          </div>
        </Card>
      ))}
    </div>
  )
}

