import {
  IconBook,
  IconLayoutDashboard,
  IconSparkles,
} from "@tabler/icons-react"

export const navItems = [
  ["Overview", "/", IconLayoutDashboard],
  ["Marketplace", "/marketplace", IconSparkles],
  ["Docs", "/docs", IconBook],
] as const
