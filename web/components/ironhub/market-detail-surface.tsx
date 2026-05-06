import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CatalogItem } from "@/lib/catalog-types"
import { formatBytes } from "@/lib/format-utils"

type MarketDetailSurfaceProps = {
  item: CatalogItem
}

export function MarketDetailSurface({ item }: MarketDetailSurfaceProps) {
  if (item.origin === "iliad") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">
            Technical Specifications
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Iliad Artifact</span>
            <p className="text-xs text-muted-foreground">
              {item.contentPath} · {formatBytes(item.contentSize)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-[10px]">15-minute download URL</Badge>
            {item.capabilitiesUrl ? (
              <Badge variant="secondary" className="text-[10px]">Capabilities descriptor</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">Prompt skill</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (item.kind === "tool") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">
            Technical Specifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-muted-foreground/70">Interface</span>
              <span className="text-sm font-medium">WIT {item.witVersion}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase text-muted-foreground/70">Capacity</span>
              <span className="text-sm font-medium">{item.actionCount} actions</span>
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase text-muted-foreground/70 block mb-2">Network Allowlist</span>
            <div className="flex flex-wrap gap-2">
              {item.httpAllowlist.map((host) => (
                <Badge key={host} variant="secondary" className="text-[10px]">
                  {host}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">
          Technical Specifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase text-muted-foreground/70">Memory Budget</span>
          <span className="text-sm font-medium">{item.maxContextTokens.toLocaleString()} tokens</span>
        </div>
        <div>
          <span className="text-[10px] uppercase text-muted-foreground/70 block mb-2">Activation Keywords</span>
          <div className="flex flex-wrap gap-2">
            {item.activationKeywords.map((keyword) => (
              <Badge key={keyword} variant="secondary" className="text-[10px]">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
