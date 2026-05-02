import {
  IconBook,
  IconLayoutDashboard,
  IconLibrary,
  IconRobot,
  IconSparkles,
} from "@tabler/icons-react"

export const navItems = [
  ["Overview", "/", IconLayoutDashboard],
  ["Marketplace", "/marketplace", IconSparkles],
  // ["Agents", "/agents", IconRobot],
  // ["Collections", "/collections", IconLibrary],
  ["Docs", "/docs", IconBook],
] as const
