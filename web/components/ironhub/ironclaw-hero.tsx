import {
  IconCloudLock,
  IconHexagonLetterW,
  IconLockSquareRounded,
  IconShieldCheck,
} from "@tabler/icons-react"
import Image from "next/image"

import { ActionLink } from "@/components/ironhub/action-link"
import { links } from "@/lib/links"

const proofPoints = [
  ["Open source", "Repo-backed catalog"],
  ["Rust runtime", "Memory-safe tools"],
  ["Wasm isolation", "Per-tool capability limits"],
] as const

export function IronClawHero() {
  return (
    <section className="relative isolate overflow-hidden rounded-xl  px-4 py-10 sm:px-0 lg:px-0">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] lg:items-center">
        <div className="max-w-3xl">
          <h1 className="mt-6 max-w-4xl font-heading text-5xl leading-[0.98] font-semibold sm:text-6xl lg:text-7xl">
            IronClaw skills that keep secrets outside the LLM.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            IronHub is the repo-backed command center for secure IronClaw skills
            and Wasm tools: encrypted vault boundaries, endpoint allowlists, and
            integration metadata visible before anything runs.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ActionLink href="/marketplace" variant="default">
              Browse secure skills
            </ActionLink>
            <ActionLink href={links.ironclaw} external>
              Open IronClaw
            </ActionLink>
            <ActionLink href={links.repo} external>
              Read the source
            </ActionLink>
          </div>
          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            {proofPoints.map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-border/80 bg-background/60 p-4 shadow-sm backdrop-blur"
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  {label}
                </p>
                <p className="mt-2 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[520px] overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xl">
          <Image
            src="/assets/iron_claw_guy1.webp"
            alt="IronClaw secure agent operator"
            fill
            priority
            className="object-cover object-[50%_30%]"
            sizes="(min-width: 1024px) 46vw, 100vw"
          />
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute top-5 left-5 rounded-lg border border-white/15 bg-black/45 px-4 py-3 text-white backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase">
              <IconShieldCheck className="size-4 text-primary" />
              Enclave ready
            </div>
            <p className="mt-2 text-2xl font-semibold">TEE boundary active</p>
          </div>
          <div className="absolute right-5 bottom-5 left-5 grid gap-3 sm:grid-cols-3">
            <HeroBadge
              icon={<IconLockSquareRounded />}
              label="Vault"
              value="encrypted"
            />
            <HeroBadge
              icon={<IconHexagonLetterW />}
              label="Tools"
              value="sandboxed"
            />
            <HeroBadge
              icon={<IconCloudLock />}
              label="Network"
              value="allowlisted"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

type HeroBadgeProps = {
  icon: React.ReactNode
  label: string
  value: string
}

function HeroBadge({ icon, label, value }: HeroBadgeProps) {
  return (
    <div className="rounded-lg border border-white/15 bg-black/45 p-3 text-white backdrop-blur-md">
      <div className="text-primary [&_svg]:size-4">{icon}</div>
      <p className="mt-2 text-[0.68rem] font-semibold text-white/65 uppercase">
        {label}
      </p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}
