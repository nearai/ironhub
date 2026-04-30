import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CatalogItem } from "@/lib/catalog-types"

type MarketDetailSurfaceProps = {
  item: CatalogItem
}

export function MarketDetailSurface({ item }: MarketDetailSurfaceProps) {
  if (item.kind === "tool") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tool surface</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {item.actionCount} actions · WIT {item.witVersion}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.httpAllowlist.map((host) => (
              <Badge key={host} variant="secondary">
                {host}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skill activation</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Context budget: {item.maxContextTokens.toLocaleString()} tokens
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {item.activationKeywords.map((keyword) => (
            <Badge key={keyword} variant="secondary">
              {keyword}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
