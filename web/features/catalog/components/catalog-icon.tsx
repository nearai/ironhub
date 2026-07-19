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
    <div className="flex size-[42px] shrink-0 items-center justify-center rounded-[11px] bg-linear-to-br from-[#0091fd] to-[#0072c9] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)]">
      <Icon aria-label={`${item.name} icon`} className="size-5" />
    </div>
  )
}
