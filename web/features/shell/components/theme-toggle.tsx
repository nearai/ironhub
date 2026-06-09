"use client"

import { IconMoon, IconSun } from "@tabler/icons-react"

import { useThemeToggle } from "@/features/shell/hooks/use-theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function ThemeToggle() {
  const { isDark, nextTheme, toggleTheme } = useThemeToggle()
  const label = `Switch to ${nextTheme} theme`
  const Icon = isDark ? IconSun : IconMoon

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={label}
          onClick={toggleTheme}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
