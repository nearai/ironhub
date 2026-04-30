import type { AgentMode } from "@/lib/agent-builder-types"
import {
  IconChartBar,
  IconCode,
  IconFeather,
  IconLink,
  IconRocket,
  IconSearch,
  IconShieldCheck,
  IconSparkles,
  IconTrendingUp,
  IconUser,
} from "@tabler/icons-react"

export const modeIcons = {
  "personal-assistant": IconUser,
  "developer-agent": IconCode,
  "research-agent": IconSearch,
  "on-chain-agent": IconLink,
  "security-agent": IconShieldCheck,
  "data-analyst": IconChartBar,
  "content-writer": IconFeather,
  "ops-agent": IconRocket,
  "trading-agent": IconTrendingUp,
  custom: IconSparkles,
} satisfies Record<AgentMode, typeof IconUser>
