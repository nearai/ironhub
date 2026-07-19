import { IconArrowRight, IconPencil } from "@tabler/icons-react"

import { MarketplaceInstallCard } from "@/features/marketplace/components/marketplace-install-card"
import { ActionLink } from "@/features/shell/components/action-link"

type IronClawHeroProps = {
  total: number
  skills: number
  tools: number
}

export function IronClawHero({ total, skills, tools }: IronClawHeroProps) {
  return (
    <section className="relative overflow-hidden pt-3 pb-10 sm:py-14 lg:py-20">
      <div className="grid items-center gap-10 md:grid-cols-[1.15fr_1fr]">
        <div className="flex max-w-2xl flex-col gap-6">
          <p className="font-mono text-[var(--fs-eyebrow)] font-semibold tracking-[0.22em] text-primary uppercase">
            {">> "}The extension hub for IronClaw
          </p>
          <h1 className="font-sans text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.04] font-black tracking-tight">
            IronHub for IronClaw{" "}
            <span className="near-gradient-text">Skills</span> and{" "}
            <span className="near-gradient-text">Tools</span>.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            Browse, install, and publish repo-backed extensions for IronClaw.
          </p>
          <p className="text-sm font-semibold text-muted-foreground">
            {total.toLocaleString("en-US")} Skills and Tools available
          </p>
          <div className="flex flex-wrap gap-4 pt-1">
            <ActionLink
              href="/marketplace"
              variant="default"
              className="h-11 px-[26px] text-base"
            >
              Skill Library
              <IconArrowRight />
            </ActionLink>
            <ActionLink
              href="/developer"
              className="h-11 px-[26px] text-base"
            >
              <IconPencil />
              Contribute
            </ActionLink>
          </div>
        </div>

        <MarketplaceInstallCard total={total} skills={skills} tools={tools} />
      </div>
    </section>
  )
}
