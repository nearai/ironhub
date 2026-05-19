import type { CatalogItem } from "@/lib/catalog/types"
import { formatBytes } from "@/lib/shared/format-utils"

type MarketDetailSpecsProps = {
  item: CatalogItem
}

export function MarketDetailSpecs({ item }: MarketDetailSpecsProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-xs font-bold tracking-wider text-muted-foreground/70 uppercase">
        Specifications
      </h4>
      <div className="grid gap-3">
        {item.kind === "tool" ? (
          <>
            <DetailRow label="WIT Interface" value={item.witVersion} mono />
            <DetailRow
              label="Action Capacity"
              value={`${item.actionCount} actions`}
            />
          </>
        ) : (
          <>
            <DetailRow
              label="Memory Budget"
              value={`${item.maxContextTokens.toLocaleString()} tokens`}
            />
            <DetailRow label="Trunk" value={item.trunk} mono truncate />
          </>
        )}
        <DetailRow label="Auth Model" value={item.auth.model} />
        <div className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Source Path</span>
          <span className="font-mono text-[10px] break-all text-muted-foreground/80">
            {item.sourcePath}
          </span>
        </div>
        {item.origin === "iliad" && (
          <DetailRow
            label="Artifact Size"
            value={formatBytes(item.contentSize || 0)}
          />
        )}
      </div>
    </div>
  )
}

type DetailRowProps = {
  label: string
  value: string
  mono?: boolean
  truncate?: boolean
}

function DetailRow({ label, value, mono, truncate }: DetailRowProps) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          truncate
            ? "max-w-[150px] truncate font-mono text-xs"
            : mono
              ? "font-mono font-medium"
              : "font-medium"
        }
      >
        {value}
      </span>
    </div>
  )
}
