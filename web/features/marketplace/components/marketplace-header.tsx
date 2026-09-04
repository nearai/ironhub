import {
  IconBox,
  IconCpu,
  IconSparkles,
  IconCloud,
} from "@tabler/icons-react"

type MarketplaceHeaderProps = {
  eyebrow?: string
  title: string
  description: string
  stats: {
    total: number
    tools: number
    skills: number
    iliad?: number
  }
  isIliadEnabled?: boolean
}

export function MarketplaceHeader({
  eyebrow = "Skill Library",
  title,
  description,
  stats,
  isIliadEnabled = false,
}: MarketplaceHeaderProps) {
  const statItems = [
    {
      label: "Total entries",
      value: stats.total,
      icon: IconBox,
      iconColor: "text-blue-500 dark:text-blue-400",
      bgHover: "group-hover:border-blue-500/30",
    },
    {
      label: "WASM tools",
      value: stats.tools,
      icon: IconCpu,
      iconColor: "text-cyan-500 dark:text-cyan-400",
      bgHover: "group-hover:border-cyan-500/30",
    },
    {
      label: "Prompt skills",
      value: stats.skills,
      icon: IconSparkles,
      iconColor: "text-amber-500 dark:text-amber-400",
      bgHover: "group-hover:border-amber-500/30",
    },
    ...(isIliadEnabled && stats.iliad !== undefined
      ? [
          {
            label: "Iliad skills",
            value: stats.iliad,
            icon: IconCloud,
            iconColor: "text-purple-500 dark:text-purple-400",
            bgHover: "group-hover:border-purple-500/30",
          },
        ]
      : []),
  ]

  return (
    <div className="relative isolate pt-2 pb-2">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -left-12 -z-10 h-64 w-96 rounded-full bg-primary/12 blur-3xl dark:bg-primary/20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-1/4 -z-10 h-48 w-80 rounded-full bg-sky-500/10 blur-3xl dark:bg-sky-500/15"
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        {/* Left Column: Eyebrow + Title + Description */}
        <div className="max-w-2xl space-y-2.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <span className="tracking-wide uppercase">{eyebrow}</span>
          </div>

          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>

          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm sm:leading-6">
            {description}
          </p>
        </div>

        {/* Right Column: Compact Glass Metric Cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:gap-3 lg:justify-end">
          {statItems.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className={`group relative flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-3.5 py-2.5 shadow-xs backdrop-blur-md transition-all duration-200 hover:bg-card/90 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] ${item.bgHover}`}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/70 transition-transform duration-200 group-hover:scale-105">
                  <Icon className={`size-4.5 ${item.iconColor}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl leading-none font-bold tracking-tight text-foreground sm:text-2xl">
                    {item.value}
                  </span>
                  <span className="mt-1 text-[11px] leading-tight font-medium text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
