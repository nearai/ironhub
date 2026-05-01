import { DetailRow } from "@/components/ironhub/detail-row"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { CatalogItem } from "@/lib/catalog-types"
import { formatBytes, formatDate } from "@/lib/format-utils"

type MarketDetailInfoProps = {
  item: CatalogItem
}

export function MarketDetailInfo({ item }: MarketDetailInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integration details</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailRow label="Version" value={item.version} />
          <DetailRow label="Author" value={item.author} />
          <DetailRow label="Auth" value={item.auth.model} />
          <DetailRow label="Source path" value={item.sourcePath} />
          {item.origin === "iliad" && (
            <>
              <DetailRow label="Publisher" value={item.remoteUserId ?? "Iliad"} />
              <DetailRow label="Artifact size" value={formatBytes(item.contentSize)} />
              <DetailRow label="Published" value={formatDate(item.publishedAt)} />
              <DetailRow
                label="Made public"
                value={formatDate(item.madePublicAt)}
              />
            </>
          )}
        </dl>
        <Separator className="my-6" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase">
          Known limits
        </h3>
        <ul className="mt-3 grid gap-2 text-sm leading-6">
          {item.limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
