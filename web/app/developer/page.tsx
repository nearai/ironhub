import { ActionLink } from "@/components/ironhub/action-link"
import { HubLayout } from "@/components/ironhub/hub-layout"
import { PageHeader } from "@/components/ironhub/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { links } from "@/lib/links"

const actions = [
  [
    "Create Skill",
    "Propose a SKILL.md branch from an existing tool trunk.",
    links.newSkill,
  ],
  [
    "Create Tool",
    "Propose a new WASM tool trunk with auth, scopes, limits, and action surface.",
    links.newTool,
  ],
  [
    "Read Contributing",
    "Follow the repo lifecycle for issues, branches, PRs, tracking, and upstream packing.",
    links.contributing,
  ],
  [
    "Open Repo",
    "Inspect source, manifests, WIT contracts, and shipped docs.",
    links.repo,
  ],
]

export default function DeveloperPage() {
  return (
    <HubLayout>
      <div className="mx-auto grid max-w-7xl gap-8">
        <PageHeader
          eyebrow="Developer portal"
          title="Ship IronClaw Skills and Tools"
          description="Use the repo lifecycle to propose skill branches, WASM tool trunks, auth scopes, limits, and tracking updates."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {actions.map(([title, description, href]) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
                <ActionLink
                  href={href}
                  external
                  variant={title === "Create Skill" ? "default" : "outline"}
                >
                  {title}
                </ActionLink>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </HubLayout>
  )
}
