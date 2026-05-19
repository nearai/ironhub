import { ActionLink } from "@/features/shell/components/action-link"
import { HubLayout } from "@/features/shell/components/hub-layout"
import { PageHeader } from "@/features/shell/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCatalog } from "@/lib/catalog/server"

export async function HubScreen() {
  const items = await getCatalog()

  return (
    <HubLayout>
      <div className="mx-auto grid max-w-7xl gap-8">
        <PageHeader
          eyebrow="My Hub"
          title="IronClaw workspace readiness"
          description="Review setup requirements for each discovered repo entry without implying install state that the workspace has not recorded."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((item) => (
            <Card key={item.slug}>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <p className="min-h-16 text-sm leading-6 text-muted-foreground">
                  {item.auth.model}
                </p>
                <ActionLink href={`/marketplace/${item.slug}`}>
                  View readiness
                </ActionLink>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </HubLayout>
  )
}
