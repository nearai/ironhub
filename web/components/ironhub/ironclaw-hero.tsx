import {
  IconArrowRight,
  IconBrandGithub,
  IconPencil,
  IconRobot,
  IconShieldCheck,
} from "@tabler/icons-react"

import { ActionLink } from "@/components/ironhub/action-link"
import { links } from "@/lib/links"
import { HomeInstallCard } from "./home-install-card"

type IronClawHeroProps = {
  total: number
  skills: number
  tools: number
}

export function IronClawHero({ total, skills, tools }: IronClawHeroProps) {
  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-10 md:grid-cols-[1.15fr_1fr]">
        <div className="flex max-w-4xl flex-col gap-5">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-bold tracking-wide text-primary uppercase w-fit">
            <IconShieldCheck className="size-4" />
            The extension hub for IronClaw
          </p>
          <h1 className="max-w-4xl font-heading text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.08] font-extrabold tracking-normal">
            IronHub, the skill and tool dock for safe agents.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            Browse, install, and publish skill and tool packs. Versioned like
            npm, searchable from the current repo-backed catalog, and wired into
            the existing IronClaw builder flow.
          </p>
          <p className="text-sm font-semibold text-muted-foreground">
            {total.toLocaleString("en-US")} skills and tools available
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <ActionLink href="/marketplace" variant="default">
              Browse marketplace
              <IconArrowRight />
            </ActionLink>
            <ActionLink href="/developer">
              <IconPencil />
              Contribute
            </ActionLink>
            <ActionLink href="/agents">
              <IconRobot />
              Build agent
            </ActionLink>
            <ActionLink href={links.repo} external>
              <IconBrandGithub />
              Source
            </ActionLink>
          </div>
        </div>

        <HomeInstallCard total={total} skills={skills} tools={tools} />
      </div>
    </section>
  )
}
