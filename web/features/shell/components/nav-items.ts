import {
  IconGitPullRequest,
  IconSparkles,
  IconRobot,
  IconCompass,
} from "@tabler/icons-react"
import { isAgentsRouteDisabled } from "@/lib/shared/feature-flags"

export const navItems = [
  ["Skill Library", "/marketplace", IconSparkles],
  ["Use Cases", "/usecases", IconCompass],
  ["Agents", "/agents", IconRobot],
  ["Contribute", "/developer", IconGitPullRequest],
] as const

export const visibleNavItems = navItems.filter(
  ([, href]) => href !== "/agents" || !isAgentsRouteDisabled,
)
