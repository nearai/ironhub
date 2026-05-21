import { IconBook, IconBrain, IconCpu, IconGitFork } from "@tabler/icons-react"

import { links } from "@/lib/shared/links"

export const creationActions = [
  {
    title: "Create Skill",
    description:
      "Propose a SKILL.md branch from an existing tool trunk to expand agent intelligence.",
    href: links.newSkill,
    icon: IconBrain,
    badgeColor:
      "from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    buttonText: "Create Skill",
  },
  {
    title: "Create Tool",
    description:
      "Propose a new WASM tool trunk with customized auth scopes, execution limits, and action surface.",
    href: links.newTool,
    icon: IconCpu,
    badgeColor:
      "from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    buttonText: "Create Tool",
  },
]

export const resourceActions = [
  {
    title: "Read Contributing",
    description:
      "Follow the structured repository lifecycle for managing branches, Pull Requests, tracking, and packing.",
    href: links.contributing,
    icon: IconGitFork,
    badgeColor:
      "from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    buttonText: "Read Contributing",
  },
  {
    title: "IronClaw Docs",
    description:
      "IronClaw is a secure, open-source AI agent framework built in Rust and deployed on NEAR AI Cloud. It enables creating AI agents with access to your tools and services, while keeping your credentials safe and private.",
    href: "https://docs.ironclaw.com/",
    icon: IconBook,
    badgeColor:
      "from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    buttonText: "Open Docs",
  },
]
