import { IconBulb } from "@tabler/icons-react"

import { Card, CardContent } from "@/components/ui/card"
import { ActionLink } from "@/features/shell/components/action-link"
import { links } from "@/lib/shared/links"

export function SuggestFeatureCard() {
  return (
    <Card className="group relative overflow-hidden rounded-xl border border-[var(--ironhub-line)] bg-card/60 backdrop-blur-xl transition-all duration-300 hover:border-primary/20 hover:bg-card hover:shadow-[var(--ironhub-shadow)]">
      <CardContent className="px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 text-yellow-600 shadow-sm transition-transform duration-300 group-hover:scale-105 dark:text-yellow-400">
              <IconBulb className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold tracking-tight">
                Suggest a Feature or Request Tools/Skills
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Got a cool idea? Tell us what you want your agent to do next.
                Request new WASM tools, integration trunks, or customized skill
                bundles, and we&apos;ll see if we can build it.
              </p>
            </div>
          </div>
          <ActionLink
            href={links.suggestFeature}
            external
            variant="outline"
            size="sm"
          >
            Suggest Feature
          </ActionLink>
        </div>
      </CardContent>
    </Card>
  )
}
