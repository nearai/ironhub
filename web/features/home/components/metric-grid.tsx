import { Card } from "@/components/ui/card"

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
        <Card
          key={metric.label}
          className="border-[var(--ih-border-ui)] bg-[var(--ih-surface-muted)] px-2 py-1.5 backdrop-blur-md sm:px-4 sm:py-4"
          size="sm"
        >
          <div className="flex items-baseline gap-1.5 px-1 sm:flex-col sm:items-start sm:gap-1 sm:px-4">
            <span className="text-sm leading-none font-bold text-[var(--ih-accent)] sm:text-2xl sm:font-semibold">
              {metric.value}
            </span>
            <span className="text-[10px] leading-none font-medium text-[var(--ih-ink-soft)] sm:text-sm">
              {metric.label}
            </span>
          </div>
        </Card>
      ))}
    </div>
  )
}
