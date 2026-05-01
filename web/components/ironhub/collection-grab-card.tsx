import { IconBoxMultiple, IconTerminal2 } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CollectionBundle } from "@/lib/collection-bundles"

type CollectionGrabCardProps = {
  bundle: CollectionBundle
}

export function CollectionGrabCard({ bundle }: CollectionGrabCardProps) {
  return (
    <Card id="bundle-manifest" className="bg-primary/8">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <IconBoxMultiple className="size-5" />
          </span>
          <div>
            <CardTitle>Grab the Whole Collection</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Install or export the full bundle as one collection instead of
              collecting entries one by one.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge>{bundle.items.length} entries</Badge>
          <Badge variant="outline">{bundle.toolCount} tools</Badge>
          <Badge variant="outline">{bundle.skillCount} skills</Badge>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-900/20 bg-slate-950 text-slate-100 shadow-inner dark:border-white/10">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-xs text-slate-400">
            <IconTerminal2 className="size-3.5 text-sky-300" />
            collection bundle
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-sm leading-7">
            <code>{`$ ironclaw hub collection install ${bundle.slug}
> ${bundle.items.length} entries selected
> ${bundle.toolCount} tools / ${bundle.skillCount} skills
> bundle ready for agent loadout`}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
