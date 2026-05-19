import { CLIInstallBox } from "@/features/marketplace/components/cli-install-box"
import { MarkdownView } from "@/features/marketplace/components/markdown-view"
import { Card, CardContent } from "@/components/ui/card"
import type { CatalogItem } from "@/lib/catalog/types"

type MarketDetailInfoProps = {
  item: CatalogItem
}

export function MarketDetailInfo({ item }: MarketDetailInfoProps) {
  return (
    <div className="w-full min-w-0 space-y-6">
      {item.useCases.length > 0 && (
        <Card className="gap-0 overflow-hidden border border-[var(--ironhub-line)] bg-card/60 py-0 shadow-[var(--ironhub-shadow)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border/30 bg-muted/30 px-5 py-3 dark:bg-muted/15">
            <h3 className="font-heading text-sm font-bold tracking-wider text-muted-foreground/90 uppercase">
              Use Cases
            </h3>
          </div>
          <CardContent className="p-5">
            <ul className="grid gap-3.5 sm:grid-cols-2">
              {item.useCases.map((useCase) => (
                <li
                  key={useCase}
                  className="flex items-start gap-2.5 text-sm text-foreground/90"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{useCase}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="block lg:hidden">
        <CLIInstallBox slug={item.slug} />
      </div>

      <Card className="gap-0 overflow-hidden border border-[var(--ironhub-line)] bg-card/60 py-0 shadow-[var(--ironhub-shadow)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-border/30 bg-muted/30 px-5 py-3 dark:bg-muted/15">
          <h3 className="font-heading text-sm font-bold tracking-wider text-muted-foreground/90 uppercase">
            Description
          </h3>
        </div>
        <CardContent className="p-5">
          <MarkdownView
            content={item.body || item.description || "No description."}
          />
        </CardContent>
      </Card>
    </div>
  )
}
