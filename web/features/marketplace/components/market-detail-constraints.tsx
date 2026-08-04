import { Badge } from "@/components/ui/badge"
import type { CatalogItem } from "@/lib/catalog/types"

type MarketDetailConstraintsProps = {
  item: CatalogItem
}

export function MarketDetailConstraints({
  item,
}: MarketDetailConstraintsProps) {
  const effects =
    item.kind === "tool"
      ? item.effects.filter((effect) => effect !== "dispatch_capability")
      : []

  return (
    <div className="space-y-4 border-t border-border/20 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
      <h4 className="text-xs font-bold tracking-wider text-muted-foreground/70 uppercase">
        Network & Permissions
      </h4>
      <div className="space-y-3">
        {item.kind === "tool" && item.httpAllowlist.length > 0 ? (
          <div>
            <span className="mb-2 block text-[10px] font-semibold text-muted-foreground uppercase">
              Network destinations
            </span>
            <div className="flex flex-wrap gap-1.5">
              {item.httpAllowlist.map((host) => (
                <Badge
                  key={host}
                  variant="secondary"
                  className="px-1.5 py-0 text-[10px]"
                >
                  {host}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            {item.kind === "skill"
              ? "Network access is defined by the selected trunk."
              : "No external network destinations declared."}
          </p>
        )}

        {effects.length > 0 && (
          <SignalList label="Effects" values={effects.map(formatEffect)} />
        )}

        {item.kind === "tool" && item.defaultPermissions.length > 0 && (
          <SignalList
            label="Default permissions"
            values={item.defaultPermissions.map(formatPermission)}
          />
        )}
      </div>
    </div>
  )
}

function SignalList({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <span className="mb-2 block text-[10px] font-semibold text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <Badge
            key={value}
            variant="outline"
            className="px-1.5 py-0 text-[10px]"
          >
            {value}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function formatEffect(effect: string) {
  const labels: Record<string, string> = {
    external_write: "Can write external data",
    network: "Uses network access",
    use_secret: "Uses credentials",
  }
  return labels[effect] ?? formatIdentifier(effect)
}

function formatPermission(permission: string) {
  const labels: Record<string, string> = {
    allow: "Allowed by default",
    ask: "Approval required",
    deny: "Blocked by default",
  }
  return labels[permission] ?? formatIdentifier(permission)
}

function formatIdentifier(value: string) {
  const label = value.replaceAll("_", " ")
  return label.charAt(0).toUpperCase() + label.slice(1)
}
