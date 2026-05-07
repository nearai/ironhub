import Image from "next/image"
import { ActionLink } from "@/components/ironhub/action-link"
import { HubLayout } from "@/components/ironhub/hub-layout"
import { PageHeader } from "@/components/ironhub/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { links } from "@/lib/links"
import {
  IconBrain,
  IconCpu,
  IconGitFork,
  IconBook,
} from "@tabler/icons-react"

const actions = [
  {
    title: "Create Skill",
    description: "Propose a SKILL.md branch from an existing tool trunk to expand agent intelligence.",
    href: links.newSkill,
    icon: IconBrain,
    badgeColor: "from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    buttonText: "Create Skill",
  },
  {
    title: "Create Tool",
    description: "Propose a new WASM tool trunk with customized auth scopes, execution limits, and action surface.",
    href: links.newTool,
    icon: IconCpu,
    badgeColor: "from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    buttonText: "Create Tool",
  },
  {
    title: "Read Contributing",
    description: "Follow the structured repository lifecycle for managing branches, Pull Requests, tracking, and packing.",
    href: links.contributing,
    icon: IconGitFork,
    badgeColor: "from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    buttonText: "Read Contributing",
  },
  {
    title: "IronClaw Docs",
    description: "IronClaw is a secure, open-source AI agent framework built in Rust and deployed on NEAR AI Cloud. It enables creating AI agents with access to your tools and services, while keeping your credentials safe and private.",
    href: "https://docs.ironclaw.com/",
    icon: IconBook,
    badgeColor: "from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    buttonText: "Open Docs",
  },
]

export default function DeveloperPage() {
  return (
    <HubLayout>
      <div className="mx-auto grid max-w-7xl gap-8">
        <PageHeader
          eyebrow="Contribute"
          title="Ship IronClaw Skills and Tools"
          description="Use the repo lifecycle to propose skill branches, WASM tool trunks, auth scopes, limits, and tracking updates."
        />

        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
              <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background border border-[var(--ironhub-line)] shadow-sm">
                <Image
                  src="/assets/iliad-logo.png"
                  alt="Iliad Logo"
                  width={56}
                  height={56}
                  className="size-full object-contain p-2"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <h3 className="text-xl font-bold tracking-tight">
                  Create IronClaw Skills, tools easily with Iliad
                </h3>
                <p className="text-sm leading-6 text-muted-foreground max-w-2xl">
                  Build custom IronClaw tools, skills, and bundles easily with the Iliad AI cloud platform. No technical experience needed.
                </p>
              </div>
              <div className="shrink-0 pt-2 sm:pt-0">
                <ActionLink href={links.iliad} external variant="default">
                  Get started
                </ActionLink>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {actions.map(({ title, description, href, icon: Icon, badgeColor, buttonText }) => (
            <Card key={title} className="group relative overflow-hidden border border-[var(--ironhub-line)] bg-card/60 backdrop-blur-xl hover:bg-card hover:border-primary/20 hover:shadow-[var(--ironhub-shadow)] transition-all duration-300">
              <CardContent className="p-6 flex flex-col h-full min-h-[220px] justify-between gap-5">
                <div className="space-y-4">
                  <div className={`inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${badgeColor} border shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                    <Icon className="size-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold tracking-tight">
                      {title}
                    </h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
                <div>
                  <ActionLink
                    href={href}
                    external
                    variant={title === "Create Skill" ? "default" : "outline"}
                  >
                    {buttonText}
                  </ActionLink>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </HubLayout>
  )
}
