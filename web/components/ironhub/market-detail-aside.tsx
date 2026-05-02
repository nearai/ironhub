import { ActionLink } from "@/components/ironhub/action-link"
import { CLIInstallBox } from "@/components/ironhub/cli-install-box"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CatalogItem } from "@/lib/catalog-types"
import { links } from "@/lib/links"

type MarketDetailAsideProps = {
  item: CatalogItem
}

export function MarketDetailAside({ item }: MarketDetailAsideProps) {
  return (
    <aside className="grid content-start gap-4">
      <CLIInstallBox slug={item.slug} />
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Relationship</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            {item.origin === "iliad"
              ? `Public ${item.kind} mirrored from Iliad publisher ${item.remoteUserId ?? "unknown"}.`
              : item.kind === "skill"
              ? `Skill branch from ${item.trunk}.`
              : item.related.branches?.length
                ? `Tool trunk with branches: ${item.related.branches.join(", ")}.`
                : "Tool trunk ready for future skill branches."}
          </p>
        </CardContent>
      </Card>
      <ActionLink href={links.newSkill} external>
        Create Skill
      </ActionLink>
    </aside>
  )
}
