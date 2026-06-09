import type { MarketplaceSidebarCategory } from "./marketplace-sidebar"

type MarketplaceMobileToolbarProps = {
  categories: MarketplaceSidebarCategory[]
  totalCount: number
}

export function MarketplaceMobileToolbar({
  categories,
  totalCount,
}: MarketplaceMobileToolbarProps) {
  void categories
  void totalCount

  return null
}
