import { ActionLink } from "@/features/shell/components/action-link"
import { HubLayout } from "@/features/shell/components/hub-layout"
import { PageHeader } from "@/features/shell/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { links, sourceLink } from "@/lib/shared/links"

const docs = [
  [
    "Repository README",
    "Current shipped inventory, layout, and contribution summary.",
    sourceLink("README.md"),
  ],
  [
    "Contribution guide",
    "Tool and skill lifecycle, PR expectations, and upstream pack flow.",
    links.contributing,
  ],
  [
    "Tracking table",
    "Live status table for every shipped integration.",
    links.tracking,
  ],
  [
    "Microsoft 365 docs",
    "Tool-specific setup and Graph capability notes.",
    sourceLink("tools/microsoft-365/README.md"),
  ],
  [
    "NEAR RPC docs",
    "Tool-specific build and usage details.",
    sourceLink("tools/near-rpc/README.md"),
  ],
  [
    "IronClaw site",
    "Public product positioning and security context.",
    links.ironclaw,
  ],
]

export function DocsScreen() {
  return (
    <HubLayout>
      <div className="mx-auto grid max-w-7xl gap-8">
        <PageHeader
          eyebrow="Docs"
          title="Docs for IronClaw Skills and Tools"
          description="Open the repo guides that define shipped tools, skill branches, manifests, tracking, and contribution flow."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {docs.map(([title, description, href]) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <p className="min-h-16 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
                <ActionLink href={href} external>
                  Open doc
                </ActionLink>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </HubLayout>
  )
}
