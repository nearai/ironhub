"use client"

import { IconSearch } from "@tabler/icons-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/shared/utils"

type CatalogSearchFieldProps = {
  value: string
  compact?: boolean
  onChange: (value: string) => void
}

export function CatalogSearchField({
  value,
  compact,
  onChange,
}: CatalogSearchFieldProps) {
  return (
    <InputGroup
      className={cn("h-11 transition-all duration-300", compact && "lg:h-9")}
    >
      <InputGroupAddon>
        <IconSearch
          className={cn(
            "size-4 transition-all duration-300",
            compact && "lg:size-3.5"
          )}
        />
      </InputGroupAddon>
      <InputGroupInput
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search Skills and Tools..."
        className={cn(
          "transition-all duration-300",
          compact && "lg:h-9 lg:py-1 lg:text-sm"
        )}
      />
    </InputGroup>
  )
}
