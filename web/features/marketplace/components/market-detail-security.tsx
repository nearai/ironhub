import { Badge } from "@/components/ui/badge"
import type { CatalogItem } from "@/lib/catalog/types"

type MarketDetailSecurityProps = {
  item: CatalogItem
}

export function MarketDetailSecurity({ item }: MarketDetailSecurityProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-xs font-bold tracking-wider text-muted-foreground/70 uppercase">
        Access & Credentials
      </h4>
      <div className="space-y-3">
        <div>
          <span className="block text-[10px] font-semibold text-muted-foreground uppercase">
            Credential method
          </span>
          <p className="mt-1 text-sm font-medium">{item.auth.model}</p>
        </div>

        {item.auth.credentials.length > 0 && (
          <div>
            <span className="mb-2 block text-[10px] font-semibold text-muted-foreground uppercase">
              Credential accounts
            </span>
            <div className="grid gap-2">
              {item.auth.credentials.map((credential) => (
                <div
                  key={`${credential.name}-${credential.method}`}
                  className="rounded-lg border border-border/50 bg-muted/20 p-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold">
                      {formatCredentialName(
                        credential.provider ?? credential.name
                      )}
                    </span>
                    <Badge
                      variant={credential.required ? "default" : "outline"}
                      className="px-1.5 py-0 text-[9px]"
                    >
                      {credential.required ? "Required" : "Optional"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {credential.method}
                  </p>
                  <code className="mt-1 block text-[10px] break-all text-muted-foreground/80">
                    {credential.name}
                  </code>
                </div>
              ))}
            </div>
          </div>
        )}

        {item.kind === "skill" && item.activationKeywords.length > 0 && (
          <BadgeList
            label="Activation keywords"
            values={item.activationKeywords}
          />
        )}
      </div>
    </div>
  )
}

type BadgeListProps = {
  label: string
  values: string[]
}

function formatCredentialName(value: string) {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
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
