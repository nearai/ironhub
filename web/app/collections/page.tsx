import { ActionLink } from "@/components/ironhub/action-link"
import { HubLayout } from "@/components/ironhub/hub-layout"
import { PageHeader } from "@/components/ironhub/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const collections = [
  [
    "Microsoft 365 workflows",
    "Outlook, Teams, Excel, SharePoint, OneDrive, Word, and PowerPoint automation.",
    "/marketplace/microsoft-365-workflow",
  ],
  [
    "NEAR protocol operations",
    "Read chain state, inspect contracts, query validators, and submit pre-signed transactions.",
    "/marketplace/near-rpc",
  ],
  [
    "Secure automation",
    "WASM isolation, host-managed credentials, explicit limits, and source-visible manifests.",
    "/marketplace?kind=tool",
  ],
]

export default function CollectionsPage() {
  return (
    <HubLayout>
      <div className="mx-auto grid max-w-7xl gap-8">
        <PageHeader
          eyebrow="Collections"
          title="Skill and tool starting points"
          description="Jump into common IronClaw workflows with the relevant repo-backed skills, tool trunks, and source links grouped together."
        />
        <div className="grid gap-4 md:grid-cols-3">
          {collections.map(([title, description, href]) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <p className="min-h-24 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
                <ActionLink href={href}>Explore</ActionLink>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </HubLayout>
  )
}
