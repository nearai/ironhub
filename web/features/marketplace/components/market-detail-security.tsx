import { Badge } from "@/components/ui/badge"
import type { CatalogItem } from "@/lib/catalog/types"

type MarketDetailSecurityProps = {
  item: CatalogItem
}

export function MarketDetailSecurity({ item }: MarketDetailSecurityProps) {
  return (
    <div className="space-y-4 border-t border-border/20 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
      <h4 className="text-xs font-bold tracking-wider text-muted-foreground/70 uppercase">
        Security & Network
      </h4>
      <div className="space-y-3">
        <SecuritySignals item={item} />
        {item.auth.requiredSecrets.length > 0 && (
          <div>
            <span className="mb-1 block text-[10px] font-semibold text-muted-foreground uppercase">
              Required Secrets
            </span>
            <div className="flex flex-wrap gap-1">
              {item.auth.requiredSecrets.map((secret) => (
                <code
                  key={secret}
                  className="rounded bg-muted px-1 text-[10px]"
                >
                  {secret}
                </code>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SecuritySignals({ item }: MarketDetailSecurityProps) {
  if (item.kind === "tool" && item.httpAllowlist.length > 0) {
    return <BadgeList label="Network Allowlist" values={item.httpAllowlist} />
  }
  if (item.kind === "skill" && item.activationKeywords.length > 0) {
    return (
      <BadgeList label="Activation Keywords" values={item.activationKeywords} />
    )
  }
  return (
    <p className="text-sm text-muted-foreground italic">
      Standard isolated execution environment.
    </p>
  )
}

type BadgeListProps = {
  label: string
  values: string[]
}

function BadgeList({ label, values }: BadgeListProps) {
  return (
    <div>
      <span className="mb-2 block text-[10px] font-semibold text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <Badge
            key={value}
            variant="secondary"
            className="px-1.5 py-0 text-[10px]"
          >
            {value}
          </Badge>
        ))}
      </div>
    </div>
  )
}
