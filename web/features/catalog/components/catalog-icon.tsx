import {
  IconBrandWindows,
  IconCube,
  IconHexagonLetterN,
  IconRobot,
} from "@tabler/icons-react"
import type { CatalogItem } from "@/lib/catalog/types"

type CatalogIconProps = {
  item: Pick<CatalogItem, "icon" | "name">
}

export function CatalogIcon({ item }: CatalogIconProps) {
  const Icon =
    item.icon === "near"
      ? IconHexagonLetterN
      : item.icon === "workflow"
        ? IconRobot
        : item.icon === "microsoft"
          ? IconBrandWindows
          : IconCube

  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
      <Icon aria-label={`${item.name} icon`} className="size-5" />
    </div>
  )
}
