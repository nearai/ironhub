import { HubLayout } from "@/features/shell/components/hub-layout"
import { MetricGrid } from "@/features/home/components/metric-grid"
import { PageHeader } from "@/features/shell/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCatalog, getCatalogStats } from "@/lib/catalog/server"

export async function InsightsScreen() {
  const items = await getCatalog()
  const stats = getCatalogStats(items)
  const secretCount = items.filter(
    (item) => item.auth.requiredSecrets.length > 0
  ).length

  return (
    <HubLayout>
      <div className="mx-auto grid max-w-7xl gap-8">
        <PageHeader
          eyebrow="Insights"
          title="IronClaw catalog signals"
          description="Track repo-derived counts for shipped skills, tool actions, credential requirements, and limits."
        >
          <MetricGrid
            metrics={[
              { label: "Repo entries", value: stats.total },
              { label: "Tool actions", value: stats.actions },
              { label: "Require secrets", value: secretCount },
              {
                label: "No required secrets",
                value: stats.total - secretCount,
              },
            ]}
          />
        </PageHeader>
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <Card key={item.slug}>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {item.category} · {item.version} · {item.status}
                </p>
                <p className="mt-4 text-sm leading-6">
                  {item.limits[0] ?? item.auth.model}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </HubLayout>
  )
}
