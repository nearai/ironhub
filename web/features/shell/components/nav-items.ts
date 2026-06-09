import {
  IconGitPullRequest,
  IconSparkles,
  IconRobot,
  IconCompass,
} from "@tabler/icons-react"

export const navItems = [
  ["Skill Library", "/marketplace", IconSparkles],
  ["Use Cases", "/usecases", IconCompass],
  ["Agents", "/agents", IconRobot],
  ["Contribute", "/developer", IconGitPullRequest],
] as const
