import { ActionLink } from "@/features/shell/components/action-link"
import { CLIInstallBox } from "@/features/marketplace/components/cli-install-box"
import { SecureInstallButton } from "@/features/marketplace/components/secure-install-button"
import type { CatalogItem } from "@/lib/catalog/types"
import { links } from "@/lib/shared/links"

type MarketDetailAsideProps = {
  item: CatalogItem
}

export function MarketDetailAside({ item }: MarketDetailAsideProps) {
  return (
    <aside className="grid w-full min-w-0 content-start gap-4">
      <SecureInstallButton slug={item.slug} />

      <div className="hidden lg:block">
        <CLIInstallBox slug={item.slug} />
      </div>

      <ActionLink href={links.newSkill} external>
        Create Skill
      </ActionLink>
    </aside>
  )
}
