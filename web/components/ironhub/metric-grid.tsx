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
        <Card key={metric.label} className="bg-background/40" size="sm">
          <CardContent>
            <div className="text-primary text-2xl font-semibold">
              {metric.value}
            </div>
            <div className="text-muted-foreground mt-1 text-sm">{metric.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
