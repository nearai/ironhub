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
import type { CatalogItem, CatalogKind } from "@/lib/catalog-types"
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
  IconX,
} from "@tabler/icons-react"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { SlotPickerModal } from "./slot-picker-modal"

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
] as const

const HIGH_FIDELITY_PRESETS = [
  {
    id: "coder",
    name: "Fullstack Architect",
    label: "Fullstack Architect",
    emoji: "💻",
    description:
      "Optimize development and operation workflows with automated toolchains, repo checks, and local builds.",
    persona: "coder",
    skillKeywords: ["github", "typescript", "git", "deploy", "review"],
    toolKeywords: ["shell", "exec", "terminal", "run", "filesystem"],
    collectionSlugs: ["agent-builder", "security-review"],
  },
  {
    id: "creative",
    name: "Marketing Catalyst",
    label: "Marketing Catalyst",
    emoji: "🚀",
    description:
      "Supercharge audience outreach, copywriting hooks, and visual asset growth pipelines.",
    persona: "creative",
    skillKeywords: ["market", "social", "copy", "hook", "writer", "content"],
    toolKeywords: ["openai", "gpt", "browser", "search"],
    collectionSlugs: ["content-studio", "product-design"],
  },
  {
    id: "researcher",
    name: "Operations Lead",
    label: "Operations Lead",
    emoji: "📊",
    description:
      "Streamline enterprise coordination, NEAR on-chain intelligence, spreadsheets, and logistics.",
    persona: "researcher",
    skillKeywords: ["business", "ops", "spreadsheet", "excel", "manage"],
    toolKeywords: ["near", "rpc", "chain", "wallet", "signer"],
    collectionSlugs: ["business-operations", "onchain-data"],
  },
]

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
  const [modalKind, setModalKind] = useState<CatalogKind>("skill")

  // Persona Modal controller
  const [personaModalOpen, setPersonaModalOpen] = useState(false)

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

    // Match skills by keywords
    let matchedSkills: CatalogItem[] = []
    for (const keyword of preset.skillKeywords) {
      const found = catalog.skills.filter(
        (s) =>
          (s.slug.toLowerCase().includes(keyword) ||
            s.name.toLowerCase().includes(keyword) ||
            (s.description && s.description.toLowerCase().includes(keyword))) &&
          !matchedSkills.some((existing) => existing.slug === s.slug)
      )
      matchedSkills = [...matchedSkills, ...found]
      if (matchedSkills.length >= 2) break
    }
    if (matchedSkills.length === 0 && catalog.skills.length > 0) {
      matchedSkills = catalog.skills.slice(0, 2)
    } else if (matchedSkills.length > 3) {
      matchedSkills = matchedSkills.slice(0, 3)
    }
    setSkills(matchedSkills)

    // Match tools by keywords
    let matchedTools: CatalogItem[] = []
    for (const keyword of preset.toolKeywords) {
      const found = catalog.tools.filter(
        (t) =>
          (t.slug.toLowerCase().includes(keyword) ||
            t.name.toLowerCase().includes(keyword) ||
            (t.description && t.description.toLowerCase().includes(keyword))) &&
          !matchedTools.some((existing) => existing.slug === t.slug)
      )
      matchedTools = [...matchedTools, ...found]
      if (matchedTools.length >= 2) break
    }
    if (matchedTools.length === 0 && catalog.tools.length > 0) {
      matchedTools = catalog.tools.slice(0, 2)
    } else if (matchedTools.length > 3) {
      matchedTools = matchedTools.slice(0, 3)
    }
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
  const handleOpenPicker = (kind: CatalogKind) => {
    setModalKind(kind)
    setModalOpen(true)
  }

  // Append new skill/tool/collection to list (avoid duplicates)
  const handleSelectItem = (item: CatalogItem | CollectionBundle) => {
    if (item.kind === "skill") {
      if (!skills.some((s) => s.slug === item.slug)) {
        setSkills([...skills, item])
      }
    } else if (item.kind === "tool") {
      if (!tools.some((t) => t.slug === item.slug)) {
        setTools([...tools, item])
      }
    } else if (item.kind === "collection") {
      if (!collections.some((c) => c.slug === item.slug)) {
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
        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--ironhub-line)] pt-4">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
            <IconSparkles className="size-4 shrink-0 animate-pulse text-primary" />
            Start with a preset:
          </span>
          <div className="flex flex-wrap gap-2">
            {HIGH_FIDELITY_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleApplyPreset(preset)}
                className="flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-full border-border/80 bg-background px-4 text-xs font-semibold shadow-sm transition-all duration-300 hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                <span className="shrink-0 text-sm">{preset.emoji}</span>
                {preset.label}
              </Button>
            ))}
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
                  size="xs"
                  onClick={() => handleOpenPicker("skill")}
                  className="shrink-0 cursor-pointer gap-1 rounded-lg border-primary/20 text-xs font-bold text-primary hover:bg-primary/5"
                >
                  <IconPlus className="size-3" />
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
                  onClick={() => handleOpenPicker("skill")}
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
                  size="xs"
                  onClick={() => handleOpenPicker("tool")}
                  className="shrink-0 cursor-pointer gap-1 rounded-lg border-primary/20 text-xs font-bold text-primary hover:bg-primary/5"
                >
                  <IconPlus className="size-3" />
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
                  onClick={() => handleOpenPicker("tool")}
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
                  size="xs"
                  onClick={() => handleOpenPicker("collection")}
                  className="shrink-0 cursor-pointer gap-1 rounded-lg border-primary/20 text-xs font-bold text-primary hover:bg-primary/5"
                >
                  <IconPlus className="size-3" />
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
                  onClick={() => handleOpenPicker("collection")}
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

      {/* SLOT PICKER DRAWER/MODAL */}
      <SlotPickerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={handleSelectItem}
        items={
          modalKind === "collection" ? catalog.collections || [] : allItems
        }
        filterKind={modalKind}
        equippedSlugs={
          modalKind === "skill"
            ? skills.map((s) => s.slug)
            : modalKind === "tool"
              ? tools.map((t) => t.slug)
              : collections.map((c) => c.slug)
        }
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
    </div>
  )
}
