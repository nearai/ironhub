import { CLIInstallBox } from "@/features/marketplace/components/cli-install-box"
import { SecureInstallButton } from "@/features/marketplace/components/secure-install-button"
import type { CatalogItem } from "@/lib/catalog/types"

type MarketDetailAsideProps = {
  item: CatalogItem
}

export function MarketDetailAside({ item }: MarketDetailAsideProps) {
  return (
    <aside className="hidden w-full min-w-0 content-start gap-4 lg:grid">
      <SecureInstallButton slug={item.slug} source="public" type={item.kind} />
      <CLIInstallBox slug={item.slug} />
    </aside>
  )
}
