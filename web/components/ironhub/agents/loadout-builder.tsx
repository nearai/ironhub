"use client"

import { CatalogIcon } from "@/components/ironhub/catalog-icon"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { CatalogItem } from "@/lib/catalog-types"
import type { CollectionBundle } from "@/lib/collection-bundles"
import { cn } from "@/lib/utils"
import {
  IconBoxMultiple,
  IconBrain,
  IconCheck,
  IconCloudUpload,
  IconCode,
  IconCopy,
  IconHeart,
  IconLoader2,
  IconPlus,
  IconRobot,
  IconShare,
  IconSparkles,
  IconTerminal,
  IconTool,
  IconTrendingUp,
  IconX,
} from "@tabler/icons-react"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { UniversalSelectionDrawer } from "./universal-selection-drawer"

type LoadoutBuilderProps = {
  catalog: {
    skills: CatalogItem[]
    tools: CatalogItem[]
    collections?: CollectionBundle[]
  }
}

const PREDEFINED_PERSONAS = [
  {
    id: "researcher",
    name: "Research Specialist",
    description:
      "Meticulous & analytical focus on objective synthesis, deep search, and fact-checking.",
    icon: IconBrain,
    gradient: "from-blue-500 to-indigo-600 shadow-blue-500/20",
    badges: ["Fact-Checker", "Objective", "Critical-Thinker"],
  },
  {
    id: "creative",
    name: "Creative Coordinator",
    description:
      "Imaginative storyteller focused on highly engaging content, copywriting, and social growth.",
    icon: IconSparkles,
    gradient: "from-fuchsia-500 to-pink-600 shadow-fuchsia-500/20",
    badges: ["Viral Hook", "Storyteller", "Copywriter"],
  },
  {
    id: "coder",
    name: "Technical Auditor",
    description:
      "Logical, structured developer persona optimized for strict protocol verification and safety.",
    icon: IconCode,
    gradient: "from-emerald-500 to-teal-600 shadow-emerald-500/20",
    badges: ["Optimizer", "Code-Secure", "Logic-Flow"],
  },
  {
    id: "evangelist",
    name: "Customer Evangelist",
    description:
      "Highly empathetic, responsive profile tailored for onboarding, guidance, and high-trust support.",
    icon: IconHeart,
    gradient: "from-orange-400 to-rose-500 shadow-orange-500/20",
    badges: ["User-First", "High-Empathy", "Onboarder"],
  },
  {
    id: "trader",
    name: "Crypto Trader",
    description:
      "Risk-aware, analytical profile optimized for tracking on-chain stats, prediction sentiment, and market data.",
    icon: IconTrendingUp,
    gradient: "from-lime-500 to-emerald-600 shadow-lime-500/20",
    badges: ["Risk-Aware", "Market-Oracle", "Numerical"],
  },
] as const

const HIGH_FIDELITY_PRESETS = [
  {
    id: "trader",
    name: "Crypto Trader",
    label: "Crypto Trader",
    emoji: "📈",
    description:
      "Analyze market trends, monitor Polymarket prediction odds, and track real-time NEAR blockchain data.",
    persona: "trader",
    skillSlugs: [
      "iliad-WyJpbGlhZC1zZWVkIiwiZGVmaS1hcmNoaXRlY3QiLCIxLjAuMCJd", // Defi Architect
      "iliad-WyJpbGlhZC1zZWVkIiwidGVjaG5pY2FsLWFuYWx5c2lzIiwiMS4wLjAiXQ", // Technical Analysis
    ],
    toolSlugs: ["near-rpc", "polymarket"],
    collectionSlugs: ["onchain-data"],
    tags: ["#crypto", "#web3", "#trading"],
  },
  {
    id: "creative",
    name: "Marketing Catalyst",
    label: "Marketing Catalyst",
    emoji: "🚀",
    description:
      "Supercharge audience outreach, copywriting hooks, and visual asset growth pipelines.",
    persona: "creative",
    skillSlugs: [
      "iliad-WyJpbGlhZC1zZWVkIiwic29jaWFsLW1lZGlhLWVuZ2luZSIsIjEuMC4wIl0", // Social Media Engine
      "iliad-WyJpbGlhZC1zZWVkIiwiY29weXdyaXRpbmctZnJhbWV3b3JrcyIsIjEuMC4wIl0", // Copywriting Frameworks
      "iliad-WyJpbGlhZC1zZWVkIiwiZW1haWwtbWFya2V0aW5nIiwiMS4wLjAiXQ", // Email Marketing
    ],
    toolSlugs: [],
    collectionSlugs: ["content-studio", "product-design"],
    tags: ["#marketing", "#social", "#creative"],
  },
  {
    id: "researcher",
    name: "Operations Lead",
    label: "Operations Lead",
    emoji: "📊",
    description:
      "Streamline enterprise coordination, NEAR on-chain intelligence, spreadsheets, and logistics.",
    persona: "researcher",
    skillSlugs: [
      "iliad-WyJpbGlhZC1zZWVkIiwidGFzay1wbGFubmVyIiwiMS4wLjAiXQ", // Task Planner
      "iliad-WyJpbGlhZC1zZWVkIiwib2tyLXBsYW5uaW5nIiwiMS4wLjAiXQ", // Okr Planning
    ],
    toolSlugs: ["near-rpc"],
    collectionSlugs: ["business-operations", "onchain-data"],
    tags: ["#research", "#operations", "#data"],
  },
  {
    id: "coder",
    name: "Fullstack Architect",
    label: "Fullstack Architect",
    emoji: "💻",
    description:
      "Optimize development and operation workflows with automated toolchains, repo checks, and local builds.",
    persona: "coder",
    skillSlugs: [
      "iliad-WyJpbGlhZC1zZWVkIiwiY29kZS1yZXZpZXciLCIxLjAuMCJd", // Code Review
      "iliad-WyJpbGlhZC1zZWVkIiwiYXBpLWRlc2lnbiIsIjEuMC4wIl0", // Api Design
      "iliad-WyJpbGlhZC1zZWVkIiwidHlwZXNjcmlwdC1leHBlcnQiLCIxLjAuMCJd", // Typescript Expert
    ],
    toolSlugs: [],
    collectionSlugs: ["agent-builder", "security-review"],
    tags: ["#dev", "#code", "#terminal"],
  },
  {
    id: "evangelist",
    name: "Customer Support Advocate",
    label: "Customer Support Advocate",
    emoji: "🤝",
    description:
      "Empathic support and guidance with customer success toolkits, feedback loops, and communication logs.",
    persona: "evangelist",
    skillSlugs: [
      "microsoft-365-workflow",
      "iliad-WyJpbGlhZC1zZWVkIiwic3Rha2Vob2xkZXItY29tbXVuaWNhdGlvbiIsIjEuMC4wIl0", // Stakeholder Communication
    ],
    toolSlugs: ["microsoft-365"],
    collectionSlugs: ["business-operations"],
    tags: ["#support", "#empathy", "#onboard"],
  },
]

const getPresetIcon = (persona: string) => {
  switch (persona) {
    case "trader":
      return IconTrendingUp
    case "coder":
      return IconCode
    case "creative":
      return IconSparkles
    case "researcher":
      return IconBrain
    case "evangelist":
      return IconHeart
    default:
      return IconSparkles
  }
}

const getPersonaColorClasses = (persona: string) => {
  switch (persona) {
    case "trader":
      return "bg-lime-50 text-lime-600 border border-lime-100 dark:bg-lime-950/30 dark:text-lime-400 dark:border-lime-900/50"
    case "coder":
      return "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50"
    case "creative":
      return "bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-100 dark:bg-fuchsia-950/30 dark:text-fuchsia-400 dark:border-fuchsia-900/50"
    case "researcher":
      return "bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50"
    case "evangelist":
      return "bg-orange-50 text-orange-600 border border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50"
    default:
      return "bg-slate-50 text-slate-600 border border-slate-100 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
  }
}

const getPresetPersonaObj = (personaId: string) => {
  return PREDEFINED_PERSONAS.find((p) => p.id === personaId) || PREDEFINED_PERSONAS[0]
}

export function LoadoutBuilder({ catalog }: LoadoutBuilderProps) {
  const searchParams = useSearchParams()
  const allItems = [...catalog.skills, ...catalog.tools]

  // Identity & Soul States
  const [name, setName] = useState(() => searchParams.get("name") || "")
  const [description, setDescription] = useState(() => searchParams.get("desc") || "")
  const [soulSource, setSoulSource] = useState<"ready-made" | "my-own">(() => {
    const soulParam = searchParams.get("soul")
    return soulParam === "ready-made" || soulParam === "my-own" ? soulParam : "my-own"
  })
  const [selectedPersona, setSelectedPersona] = useState<string>(() => searchParams.get("persona") || "researcher")

  // Multi-item lists for Skills, Tools, and Collections!
  const [skills, setSkills] = useState<CatalogItem[]>(() => {
    const skillsParam = searchParams.get("skills")
    if (!skillsParam) return []
    const slugs = skillsParam.split(",").filter(Boolean)
    return allItems.filter((item) => item.kind === "skill" && slugs.includes(item.slug))
  })
  const [tools, setTools] = useState<CatalogItem[]>(() => {
    const toolsParam = searchParams.get("tools")
    if (!toolsParam) return []
    const slugs = toolsParam.split(",").filter(Boolean)
    return allItems.filter((item) => item.kind === "tool" && slugs.includes(item.slug))
  })
  const [collections, setCollections] = useState<CollectionBundle[]>(() => {
    const collectionsParam = searchParams.get("collections")
    if (!collectionsParam || !catalog.collections) return []
    const slugs = collectionsParam.split(",").filter(Boolean)
    return catalog.collections.filter((c) => slugs.includes(c.slug))
  })

  // Picker Modal controls
  const [modalOpen, setModalOpen] = useState(false)
  const [initialTab, setInitialTab] = useState<"all" | "skill" | "tool" | "collection">("skill")

  // Persona Modal controller
  const [personaModalOpen, setPersonaModalOpen] = useState(false)

  // Preset Modal controller
  const [presetModalOpen, setPresetModalOpen] = useState(false)

  // Action Bar states
  const [shareCopied, setShareCopied] = useState(false)
  const [cliCopied, setCliCopied] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploySuccess, setDeploySuccess] = useState(false)

  const handleApplyPreset = (preset: (typeof HIGH_FIDELITY_PRESETS)[0]) => {
    setName(preset.name)
    setDescription(preset.description)
    setSoulSource("ready-made")
    setSelectedPersona(preset.persona)

    // Match skills by exact slugs
    const matchedSkills = catalog.skills.filter((s) => preset.skillSlugs.includes(s.slug))
    setSkills(matchedSkills)

    // Match tools by exact slugs
    const matchedTools = catalog.tools.filter((t) => preset.toolSlugs.includes(t.slug))
    setTools(matchedTools)

    // Match collections by slugs
    if (catalog.collections) {
      const matchedCollections = catalog.collections.filter((c) =>
        preset.collectionSlugs.includes(c.slug)
      )
      setCollections(matchedCollections)
    }
  }

  // Helper: Slugify text for loadoutId
  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-")
  }

  // Live Compiled CLI installer string
  const loadoutId = slugify(name) || "custom-agent"
  const soulFlag =
    soulSource === "ready-made" ? ` --soul ${selectedPersona}` : " --soul local"
  const cliCommand = `ironclaw hub loadout install ${loadoutId}${soulFlag}${
    skills.length ? ` --skills ${skills.map((s) => s.slug).join(",")}` : ""
  }${tools.length ? ` --tools ${tools.map((t) => t.slug).join(",")}` : ""}${
    collections.length
      ? ` --collections ${collections.map((c) => c.slug).join(",")}`
      : ""
  }`

  // Modal selector trigger
  const handleOpenDrawer = (tab: "all" | "skill" | "tool" | "collection") => {
    setInitialTab(tab)
    setModalOpen(true)
  }

  // Toggle item in selection cart
  const handleToggleItem = (item: CatalogItem | CollectionBundle) => {
    if (item.kind === "skill") {
      if (skills.some((s) => s.slug === item.slug)) {
        setSkills(skills.filter((s) => s.slug !== item.slug))
      } else {
        setSkills([...skills, item])
      }
    } else if (item.kind === "tool") {
      if (tools.some((t) => t.slug === item.slug)) {
        setTools(tools.filter((t) => t.slug !== item.slug))
      } else {
        setTools([...tools, item])
      }
    } else if (item.kind === "collection") {
      if (collections.some((c) => c.slug === item.slug)) {
        setCollections(collections.filter((c) => c.slug !== item.slug))
      } else {
        setCollections([...collections, item as CollectionBundle])
      }
    }
  }

  // Remove skill/tool/collection
  const handleRemoveSkill = (slug: string) => {
    setSkills(skills.filter((s) => s.slug !== slug))
  }

  const handleRemoveTool = (slug: string) => {
    setTools(tools.filter((t) => t.slug !== slug))
  }

  const handleRemoveCollection = (slug: string) => {
    setCollections(collections.filter((c) => c.slug !== slug))
  }

  // Serialize and share full configuration
  const handleShare = async () => {
    const params = new URLSearchParams()
    params.set("name", name)
    params.set("desc", description)
    params.set("soul", soulSource)
    if (soulSource === "ready-made") params.set("persona", selectedPersona)
    if (skills.length > 0)
      params.set("skills", skills.map((s) => s.slug).join(","))
    if (tools.length > 0)
      params.set("tools", tools.map((t) => t.slug).join(","))
    if (collections.length > 0)
      params.set("collections", collections.map((c) => c.slug).join(","))

    const shareUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`

    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy share link", err)
    }
  }

  // Silent clipboard copy helper for CLI installation
  const handleCopyCli = async () => {
    try {
      await navigator.clipboard.writeText(cliCommand)
      setCliCopied(true)
      setTimeout(() => setCliCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy CLI command", err)
    }
  }

  // Mock Deploy Trigger
  const handleDeploy = () => {
    setIsDeploying(true)
    setTimeout(() => {
      setIsDeploying(false)
      setDeploySuccess(true)
      setTimeout(() => setDeploySuccess(false), 3500)
    }, 2000)
  }

  // Find currently active persona object
  const activePersonaObj =
    PREDEFINED_PERSONAS.find((p) => p.id === selectedPersona) ||
    PREDEFINED_PERSONAS[0]


  return (
    <div className="mx-auto max-w-7xl space-y-8 px-0 pb-40">
      {/* HEADER SECTION WITH GLASSMORPHIC BACKGROUND BLUR */}
      <div className="flex w-full flex-col gap-5 rounded-xl border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-[var(--ironhub-shadow)] backdrop-blur-xl sm:p-6">
        <div className="space-y-2">
          <p className="text-xs font-bold tracking-wider text-primary uppercase">
            Agents / Loadout Builder
          </p>
          <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            Assemble Agent Loadout
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Configure, use and share your custom agent loadout of skills, tools,
            and identity.
          </p>
        </div>

        {/* INLINE TEMPLATES / PRESETS SELECTOR */}
        <div className="flex flex-col gap-3.5 border-t border-[var(--ironhub-line)] pt-4 md:flex-row md:items-center">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-zinc-300">
            <IconSparkles className="size-4 text-blue-500 shrink-0" />
            Start with a preset:
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            {HIGH_FIDELITY_PRESETS.slice(0, 3).map((preset) => {
              const Icon = getPresetIcon(preset.persona)
              const colorClasses = getPersonaColorClasses(preset.persona)
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="flex h-11 shrink-0 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500 hover:bg-blue-50/5 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-400"
                >
                  <div className={cn("flex size-6 shrink-0 items-center justify-center rounded-full shadow-sm", colorClasses)}>
                    <Icon className="size-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    {preset.label}
                  </span>
                </button>
              )
            })}

            {HIGH_FIDELITY_PRESETS.length > 3 && (
              <button
                type="button"
                onClick={() => setPresetModalOpen(true)}
                className="flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-transparent px-4 text-xs font-bold text-slate-600 transition-all duration-200 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
              >
                + {HIGH_FIDELITY_PRESETS.length - 3} More
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ASYMMETRIC 2-COLUMN GRID ON DESKTOP */}
      <div className="grid w-full min-w-0 items-start gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: IDENTITY & SOUL CONFIGURATION (4 Cols - ~33.3%) */}
        <div className="w-full min-w-0 space-y-6 lg:col-span-4">
          {/* IDENTITY CARD */}
          <Card className="border border-[var(--ironhub-line)] bg-card/70 shadow-[var(--ironhub-shadow)] backdrop-blur-xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 font-heading text-base font-bold tracking-wider text-primary uppercase">
                <IconRobot className="size-4 text-primary" />
                Identity
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed text-muted-foreground">
                Give your custom curated loadout a unique name and description.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                  Loadout Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Agent Name"
                  className="h-10 border-border/80 bg-background/50 text-sm font-semibold text-foreground focus-visible:ring-primary/40"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your loadout capabilities..."
                  className="min-h-24 resize-none border-border/80 bg-background/50 text-xs leading-relaxed text-foreground focus-visible:ring-primary/40"
                />
              </div>
            </CardContent>
          </Card>

          {/* SOUL CARD */}
          <Card className="border border-[var(--ironhub-line)] bg-card/70 shadow-[var(--ironhub-shadow)] backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-heading text-base font-bold tracking-wider text-primary uppercase">
                <IconBrain className="size-4 text-primary" />
                Soul Configuration
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed text-muted-foreground">
                Choose the personality and behavioral core for this agent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {/* Ready-made Option */}
                <div
                  onClick={() => setSoulSource("ready-made")}
                  className={cn(
                    "relative flex cursor-pointer flex-col rounded-xl border bg-background/40 p-4 transition-all duration-300 hover:bg-muted/10 hover:shadow-sm",
                    soulSource === "ready-made"
                      ? "border-primary bg-primary/5 shadow-[0_0_12px_rgba(43,130,212,0.12)] ring-1 ring-primary/30"
                      : "border-border/60"
                  )}
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <div
                      className={cn(
                        "flex size-3.5 items-center justify-center rounded-full border transition-all",
                        soulSource === "ready-made"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/60"
                      )}
                    >
                      {soulSource === "ready-made" && (
                        <div className="size-1 rounded-full bg-background" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-foreground">
                      Ready-made Soul
                    </span>
                  </div>
                  <p className="pl-5 text-[11px] leading-relaxed text-muted-foreground">
                    Inherit preconfigured guidelines, boundaries, and
                    personality traits automatically.
                  </p>

                  {/* HIGH-FIDELITY ACTIVE PERSONA CARD PREVIEW */}
                  {soulSource === "ready-made" && (
                    <div
                      className="group/pcard mt-3.5 flex items-center justify-between rounded-xl border border-border/70 bg-background/60 p-3 shadow-inner transition-all duration-300 hover:border-primary/25 hover:bg-background/80"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPersonaModalOpen(true)
                      }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover/pcard:scale-105",
                            activePersonaObj.gradient
                          )}
                        >
                          <activePersonaObj.icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] leading-snug font-bold text-foreground transition-colors group-hover/pcard:text-primary">
                            {activePersonaObj.name}
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-[10px] leading-relaxed font-medium text-muted-foreground">
                            {activePersonaObj.description}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        className="ml-2.5 h-7 shrink-0 cursor-pointer rounded-lg border-primary/20 px-2.5 text-[10px] font-extrabold text-primary transition-all hover:bg-primary/5"
                      >
                        Change
                      </Button>
                    </div>
                  )}
                </div>

                {/* My Own Soul Option */}
                <div
                  onClick={() => setSoulSource("my-own")}
                  className={cn(
                    "relative flex cursor-pointer flex-col rounded-xl border bg-background/40 p-4 transition-all duration-300 hover:bg-muted/10 hover:shadow-sm",
                    soulSource === "my-own"
                      ? "border-primary bg-primary/5 shadow-[0_0_12px_rgba(43,130,212,0.12)] ring-1 ring-primary/30"
                      : "border-border/60"
                  )}
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <div
                      className={cn(
                        "flex size-3.5 items-center justify-center rounded-full border transition-all",
                        soulSource === "my-own"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/60"
                      )}
                    >
                      {soulSource === "my-own" && (
                        <div className="size-1 rounded-full bg-background" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-foreground">
                      My Own Soul
                    </span>
                  </div>
                  <p className="pl-5 text-[11px] leading-relaxed text-muted-foreground">
                    Keep your agent soul.md intact. You can still add skills,
                    and tools.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: SLOTS MANAGEMENT (8 Cols - ~66.7% - Breathing Room!) */}
        <div className="w-full min-w-0 space-y-6 lg:col-span-8">
          {/* SKILLS LOADOUT CARD */}
          <Card className="border border-[var(--ironhub-line)] bg-card/70 shadow-[var(--ironhub-shadow)] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 font-heading text-base font-bold tracking-wider text-primary uppercase">
                  <IconSparkles className="size-4" />
                  Select Skills
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Equip skills into your agent&apos;s capability roster.
                </CardDescription>
              </div>

              {skills.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDrawer("skill")}
                  className="shrink-0 cursor-pointer gap-1.5 rounded-full border-primary/30 px-3.5 py-1 text-xs font-extrabold text-primary shadow-sm hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                >
                  <IconPlus className="size-3.5 stroke-[3px]" />
                  Add Skill
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {skills.length > 0 ? (
                <div className="grid w-full min-w-0 gap-2">
                  {skills.map((skill) => (
                    <div
                      key={skill.slug}
                      className="group flex w-full min-w-0 items-center justify-between rounded-xl border border-border/70 bg-background/55 p-3.5 shadow-sm transition-all duration-300 hover:border-primary/20 hover:bg-background/80"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <CatalogIcon item={skill} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                            {skill.name}
                          </div>
                          <div className="truncate text-[11px] font-medium text-muted-foreground">
                            By {skill.author}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSkill(skill.slug)}
                        className="ml-2 size-8 shrink-0 cursor-pointer rounded-full text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove skill ${skill.name}`}
                      >
                        <IconX className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenDrawer("skill")}
                  className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 bg-background/20 px-4 py-10 text-muted-foreground/80 shadow-inner transition-all hover:border-primary/50 hover:bg-background/50 hover:text-primary"
                >
                  <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <IconPlus className="size-4" />
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    Choose Skills
                  </span>
                  <span className="max-w-xs text-center text-[11px] leading-relaxed text-muted-foreground">
                    Choose from search, coding, marketing, or custom
                    capabilities.
                  </span>
                </button>
              )}
            </CardContent>
          </Card>

          {/* EXECUTION TOOLS CARD */}
          <Card className="border border-[var(--ironhub-line)] bg-card/70 shadow-[var(--ironhub-shadow)] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 font-heading text-base font-bold tracking-wider text-primary uppercase">
                  <IconTool className="size-4 text-sky-500" />
                  Select Tools
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Choose tools to empower your agent&apos;s runtime actions.
                </CardDescription>
              </div>

              {tools.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDrawer("tool")}
                  className="shrink-0 cursor-pointer gap-1.5 rounded-full border-primary/30 px-3.5 py-1 text-xs font-extrabold text-primary shadow-sm hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                >
                  <IconPlus className="size-3.5 stroke-[3px]" />
                  Add Tool
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {tools.length > 0 ? (
                <div className="grid w-full min-w-0 gap-2">
                  {tools.map((tool) => (
                    <div
                      key={tool.slug}
                      className="group flex w-full min-w-0 items-center justify-between rounded-xl border border-border/70 bg-background/55 p-3.5 shadow-sm transition-all duration-300 hover:border-primary/20 hover:bg-background/80"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <CatalogIcon item={tool} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                            {tool.name}
                          </div>
                          <div className="truncate text-[11px] font-medium text-muted-foreground">
                            By {tool.author}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTool(tool.slug)}
                        className="ml-2 size-8 shrink-0 cursor-pointer rounded-full text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove tool ${tool.name}`}
                      >
                        <IconX className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenDrawer("tool")}
                  className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 bg-background/20 px-4 py-10 text-muted-foreground/80 shadow-inner transition-all hover:border-primary/50 hover:bg-background/50 hover:text-primary"
                >
                  <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <IconPlus className="size-4" />
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    Choose Tools
                  </span>
                  <span className="max-w-xs text-center text-[11px] leading-relaxed text-muted-foreground">
                    Choose execution tools to empower your agent&apos;s runtime
                    actions.
                  </span>
                </button>
              )}
            </CardContent>
          </Card>

          {/* EQUIPPED COLLECTIONS CARD */}
          <Card className="border border-[var(--ironhub-line)] bg-card/70 shadow-[var(--ironhub-shadow)] backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 font-heading text-base font-bold tracking-wider text-primary uppercase">
                  <IconBoxMultiple className="size-4 text-sky-500" />
                  Select Collections
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Choose pre-configured collection stacks to auto-wire
                  capabilities.
                </CardDescription>
              </div>

              {collections.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDrawer("collection")}
                  className="shrink-0 cursor-pointer gap-1.5 rounded-full border-primary/30 px-3.5 py-1 text-xs font-extrabold text-primary shadow-sm hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                >
                  <IconPlus className="size-3.5 stroke-[3px]" />
                  Add Collection
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {collections.length > 0 ? (
                <div className="grid w-full min-w-0 gap-2">
                  {collections.map((col) => (
                    <div
                      key={col.slug}
                      className="group flex w-full min-w-0 items-center justify-between rounded-xl border border-border/70 bg-background/55 p-3.5 shadow-sm transition-all duration-300 hover:border-primary/20 hover:bg-background/80"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                          <IconBoxMultiple className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                            {col.title}
                          </div>
                          <div className="truncate text-[11px] font-medium text-muted-foreground">
                            {col.summary}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCollection(col.slug)}
                        className="ml-2 size-8 shrink-0 cursor-pointer rounded-full text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove collection ${col.title}`}
                      >
                        <IconX className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenDrawer("collection")}
                  className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 bg-background/20 px-4 py-10 text-muted-foreground/80 shadow-inner transition-all hover:border-primary/50 hover:bg-background/50 hover:text-primary"
                >
                  <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <IconPlus className="size-4" />
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    Choose Collections
                  </span>
                  <span className="max-w-xs text-center text-[11px] leading-relaxed text-muted-foreground">
                    Choose collection stacks to auto-wire specialized
                    capabilities.
                  </span>
                </button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* COMPACT ACTIONS FOOTER (Flush attached to bottom-0, responsive, space-saving design) */}
      <footer className="fixed bottom-0 left-0 z-40 w-full border-t border-border bg-background/95 px-6 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] backdrop-blur-md dark:bg-zinc-950/95">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* DESKTOP VIEWPORT ACTION BAR (md breakpoint and up) */}
          <div className="hidden w-full items-center justify-between md:flex">
            {/* Left Column: Share outline button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleShare}
              className={cn(
                "h-11 shrink-0 cursor-pointer gap-2 rounded-xl border-border/80 px-5 font-semibold transition-all duration-300",
                shareCopied &&
                  "border-emerald-500 bg-emerald-50 font-bold text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
              )}
            >
              {shareCopied ? (
                <>
                  <IconCheck className="size-4 text-emerald-500" />
                  Copied Link!
                </>
              ) : (
                <>
                  <IconShare className="size-4 text-muted-foreground" />
                  Share Loadout
                </>
              )}
            </Button>

            {/* Right Column: Inline CLI snippet and Cloud Deploy solid button */}
            <div className="flex items-center gap-4">
              <code className="flex items-center gap-2 rounded-xl border border-border/60 bg-slate-100 px-3.5 py-2 font-mono text-sm font-semibold text-foreground dark:bg-zinc-800">
                <span className="font-mono font-bold text-muted-foreground/80">
                  $
                </span>
                <span className="max-w-sm truncate lg:max-w-md">
                  {cliCommand}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCli}
                  className="ml-1.5 shrink-0 cursor-pointer rounded-lg p-1 text-muted-foreground transition-all hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
                  title="Copy command"
                >
                  {cliCopied ? (
                    <IconCheck className="size-3.5 text-emerald-500" />
                  ) : (
                    <IconCopy className="size-3.5" />
                  )}
                </button>
              </code>

              <Button
                type="button"
                disabled={isDeploying}
                onClick={handleDeploy}
                className={cn(
                  "h-11 shrink-0 cursor-pointer gap-2 rounded-xl px-6 font-semibold shadow-sm transition-all duration-300",
                  deploySuccess
                    ? "bg-emerald-600 text-white hover:bg-emerald-600"
                    : "bg-primary text-primary-foreground hover:bg-primary/95 hover:shadow-[0_0_15px_rgba(43,130,212,0.25)]"
                )}
              >
                {isDeploying ? (
                  <>
                    <IconLoader2 className="size-4 animate-spin" />
                    Deploying...
                  </>
                ) : deploySuccess ? (
                  <>
                    <IconCheck className="size-4" />
                    Deployed Cloud!
                  </>
                ) : (
                  <>
                    <IconCloudUpload className="size-4" />
                    Deploy Cloud
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* MOBILE VIEWPORT ACTION BAR (Base breakpoint < md) */}
          <div className="flex w-full flex-col gap-2.5 md:hidden">
            {/* Top Row: Full width primary Deploy Cloud button */}
            <Button
              type="button"
              disabled={isDeploying}
              onClick={handleDeploy}
              className={cn(
                "h-11 w-full cursor-pointer gap-2 rounded-xl font-semibold shadow-sm transition-all duration-300",
                deploySuccess
                  ? "bg-emerald-600 text-white hover:bg-emerald-600"
                  : "bg-primary text-primary-foreground hover:bg-primary/95"
              )}
            >
              {isDeploying ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  Deploying...
                </>
              ) : deploySuccess ? (
                <>
                  <IconCheck className="size-4" />
                  Deployed Cloud!
                </>
              ) : (
                <>
                  <IconCloudUpload className="size-4" />
                  Deploy Cloud
                </>
              )}
            </Button>

            {/* Bottom Row: 2 equal-width column grid for Share and Copy CLI */}
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleShare}
                className={cn(
                  "h-11 cursor-pointer gap-2 rounded-xl border-border/80 font-semibold transition-all duration-300",
                  shareCopied &&
                    "border-emerald-500 bg-emerald-50 font-bold text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                )}
              >
                {shareCopied ? (
                  <>
                    <IconCheck className="size-4 text-emerald-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <IconShare className="size-4 text-muted-foreground" />
                    Share
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleCopyCli}
                className={cn(
                  "h-11 cursor-pointer gap-2 rounded-xl border-border/80 font-semibold transition-all duration-300",
                  cliCopied &&
                    "border-emerald-500 bg-emerald-50 font-bold text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                )}
              >
                {cliCopied ? (
                  <>
                    <IconCheck className="size-4 text-emerald-500" />
                    Copied CLI!
                  </>
                ) : (
                  <>
                    <IconTerminal className="size-4 text-muted-foreground" />
                    Copy CLI
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </footer>

      {/* UNIVERSAL CATALOG DRAWER */}
      <UniversalSelectionDrawer
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onToggle={handleToggleItem}
        skills={catalog.skills}
        tools={catalog.tools}
        collections={catalog.collections || []}
        initialTab={initialTab}
        equippedSkills={skills.map((s) => s.slug)}
        equippedTools={tools.map((t) => t.slug)}
        equippedCollections={collections.map((c) => c.slug)}
      />

      {/* GORGEOUS HIGH-FIDELITY PERSONA SELECTOR POPUP MODAL */}
      {personaModalOpen && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-background/80 p-4 backdrop-blur-sm duration-200 fade-in">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl animate-in flex-col overflow-hidden rounded-2xl border border-[var(--ironhub-line)] bg-card shadow-xl duration-200 zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/40 p-5">
              <div>
                <h3 className="flex items-center gap-2 font-heading text-base font-bold text-foreground">
                  <IconSparkles className="size-4.5 text-primary" />
                  Select Ready-made Persona Core
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Configure your AI agent&apos;s personality guidelines, behavior
                  limitations, and speaking traits.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPersonaModalOpen(false)}
                className="size-8 shrink-0 cursor-pointer rounded-full text-muted-foreground/60 hover:bg-muted hover:text-foreground"
              >
                <IconX className="size-4" />
              </Button>
            </div>

            {/* Modal Content - Persona Cards List */}
            <div className="flex-1 space-y-3.5 overflow-y-auto p-5">
              {PREDEFINED_PERSONAS.map((p) => {
                const isSelected = selectedPersona === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPersona(p.id)
                      setPersonaModalOpen(false)
                    }}
                    className={cn(
                      "group flex cursor-pointer flex-col justify-between rounded-2xl border bg-background/45 p-4 transition-all duration-300 hover:bg-muted/12 hover:shadow-sm md:flex-row md:items-center",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md ring-1 shadow-primary/5 ring-primary/20"
                        : "border-border/60 hover:border-primary/20"
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      {/* Colored Gradient Icon Box */}
                      <div
                        className={cn(
                          "mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-105 md:mt-0",
                          p.gradient
                        )}
                      >
                        <p.icon className="size-6" />
                      </div>

                      {/* Info & Badges */}
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="text-sm leading-none font-bold text-foreground transition-colors group-hover:text-primary">
                            {p.name}
                          </span>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] leading-none font-extrabold tracking-widest text-emerald-500 uppercase">
                              <IconCheck className="size-2.5" />
                              Active
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {p.description}
                        </p>

                        {/* Sub-badges for behavior tags */}
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {p.badges.map((b) => (
                            <span
                              key={b}
                              className="rounded-md border border-border/20 bg-muted px-2 py-0.5 text-[9px] font-extrabold tracking-widest text-muted-foreground/90 uppercase"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Active Equip State button */}
                    <Button
                      type="button"
                      variant={isSelected ? "secondary" : "outline"}
                      size="sm"
                      className="mt-4 h-9 shrink-0 cursor-pointer rounded-xl px-4 text-xs font-bold transition-all md:mt-0 md:ml-4"
                    >
                      {isSelected ? "Equipped" : "Equip"}
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* HIGH-FIDELITY PRESET SELECTION MODAL */}
      {presetModalOpen && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-background/80 p-4 backdrop-blur-sm duration-200 fade-in">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl animate-in flex-col overflow-hidden rounded-2xl border border-[var(--ironhub-line)] bg-card shadow-xl duration-200 zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border/40 p-5">
              <div>
                <h3 className="flex items-center gap-2 font-heading text-base font-bold text-foreground">
                  <IconSparkles className="size-4.5 text-primary" />
                  Select a Preset Loadout
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Supercharge your workspace instantly with one of our high-fidelity pre-configured setups.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPresetModalOpen(false)}
                className="size-8 shrink-0 cursor-pointer rounded-full text-muted-foreground/60 hover:bg-muted hover:text-foreground"
              >
                <IconX className="size-4" />
              </Button>
            </div>

            {/* Modal Content - Preset Cards List */}
            <div className="flex-1 space-y-3.5 overflow-y-auto p-5">
              {HIGH_FIDELITY_PRESETS.map((preset) => {
                const isEquipped = name === preset.name
                const personaObj = getPresetPersonaObj(preset.persona)
                const Icon = getPresetIcon(preset.persona)
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      handleApplyPreset(preset)
                      setPresetModalOpen(false)
                    }}
                    className={cn(
                      "group flex cursor-pointer flex-col justify-between rounded-2xl border bg-background/45 p-4 transition-all duration-300 hover:bg-muted/12 hover:shadow-sm md:flex-row md:items-center",
                      isEquipped
                        ? "border-primary bg-primary/5 shadow-md ring-1 shadow-primary/5 ring-primary/20"
                        : "border-border/60 hover:border-primary/20"
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      {/* Left Section: Colored Gradient Icon Box matching Ready-made Persona style */}
                      <div
                        className={cn(
                          "mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-105 md:mt-0",
                          personaObj.gradient
                        )}
                      >
                        <Icon className="size-6" />
                      </div>

                      {/* Middle Section: Info & Tags */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="text-sm leading-none font-bold text-slate-800 dark:text-zinc-100 transition-colors group-hover:text-primary">
                            {preset.name}
                          </span>
                          {isEquipped && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] leading-none font-extrabold tracking-widest text-emerald-500 uppercase">
                              <IconCheck className="size-2.5" />
                              Active
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {preset.description}
                        </p>

                        {/* Lowercase capsules for tags */}
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {preset.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-zinc-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Section: Equip state action button */}
                    <div className="mt-4 shrink-0 md:mt-0 md:ml-4">
                      {isEquipped ? (
                        <Button
                          type="button"
                          variant="ghost"
                          disabled
                          className="h-9 w-24 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                        >
                          Equipped
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 w-24 rounded-xl text-xs font-bold transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary"
                        >
                          Equip
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
