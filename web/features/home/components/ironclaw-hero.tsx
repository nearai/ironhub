import {
  IconArrowRight,
  IconPencil,
  IconShieldCheck,
} from "@tabler/icons-react"

import { MarketplaceInstallCard } from "@/features/marketplace/components/marketplace-install-card"
import { ActionLink } from "@/features/shell/components/action-link"

type IronClawHeroProps = {
  total: number
  skills: number
  tools: number
}

export function IronClawHero({ total, skills, tools }: IronClawHeroProps) {
  return (
    <section className="relative overflow-hidden px-4 py-4 sm:px-6 sm:py-10 lg:px-4 lg:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-6 md:grid-cols-[1.15fr_1fr] md:gap-10">
        <div className="flex max-w-4xl flex-col gap-5">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-bold tracking-wide text-primary uppercase">
            <IconShieldCheck className="size-4" />
            The extension hub for IronClaw
          </p>
          <h1 className="max-w-4xl font-heading text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.08] font-extrabold tracking-normal">
            IronHub for IronClaw Skills and Tools.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            Browse, install, and publish repo-backed extensions for IronClaw.
          </p>
          <p className="text-sm font-semibold text-muted-foreground">
            {total.toLocaleString("en-US")} Skills and Tools available
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <ActionLink href="/marketplace" variant="default">
              Skill Library
              <IconArrowRight />
            </ActionLink>
            <ActionLink href="/developer">
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
