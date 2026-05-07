import { ActionLink } from "@/components/ironhub/action-link"
import { CLIInstallBox } from "@/components/ironhub/cli-install-box"
import type { CatalogItem } from "@/lib/catalog-types"
import { links } from "@/lib/links"

type MarketDetailAsideProps = {
  item: CatalogItem
}

export function MarketDetailAside({ item }: MarketDetailAsideProps) {
  return (
    <aside className="grid w-full min-w-0 content-start gap-4">
      <div className="hidden lg:block">
        <CLIInstallBox slug={item.slug} />
      </div>

      <ActionLink href={links.newSkill} external>
        Create Skill
      </ActionLink>
    </aside>
  )
}

