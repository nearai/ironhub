"use client"

import React, { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePartnerStore } from "@/features/partner/store/partner-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconCopy,
  IconCheck,
  IconLock,
  IconWorld,
  IconEdit,
  IconCode,
} from "@tabler/icons-react"
import { PageHeader } from "@/features/shell/components/page-header"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditSkillPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { state, updateSubmission, notify } = usePartnerStore()
  const { submissions } = state

  const submission = submissions.find((sub) => sub.id === id)

  // Form states
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [version, setVersion] = useState("1.0.0")
  const [valueProp, setValueProp] = useState("")
  const [valueTagsText, setValueTagsText] = useState("")
  const [activationKeywordsText, setActivationKeywordsText] = useState("")
  const [activationTagsText, setActivationTagsText] = useState("")
  const [useCases, setUseCases] = useState<string[]>([])
  const [markdownContent, setMarkdownContent] = useState("")
  const [visibility, setVisibility] = useState<"public" | "private">("private")

  // UI state
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")
  const [copiedPreview, setCopiedPreview] = useState(false)

  // Seed form values when submission is loaded
  useEffect(() => {
    if (submission) {
      setTitle(submission.title)
      setSlug(submission.id)
      setVersion(submission.version)
      setValueProp(submission.valueProp || "")
      setValueTagsText(submission.valueTags ? submission.valueTags.join(", ") : "")
      setActivationKeywordsText(submission.activationKeywords ? submission.activationKeywords.join(", ") : "")
      setActivationTagsText(submission.activationTags ? submission.activationTags.join(", ") : "")
      setUseCases(submission.useCases || [])
      setMarkdownContent(submission.markdownContent || "")
      setVisibility(submission.visibility)
    }
  }, [submission])

  if (!submission || submission.type !== "skill") {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-bold text-foreground">Skill not found</h3>
        <Button asChild variant="link" className="mt-2">
          <Link href="/mvp/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    )
  }

  // Handle use case list editing
  const handleAddUseCase = () => {
    setUseCases([...useCases, ""])
  }

  const handleUseCaseChange = (index: number, val: string) => {
    const updated = [...useCases]
    updated[index] = val
    setUseCases(updated)
  }

  const handleRemoveUseCase = (index: number) => {
    const updated = useCases.filter((_, i) => i !== index)
    setUseCases(updated)
  }

  // Compile SKILL.md Markdown format
  const compileSkillMarkdown = () => {
    const valTags = valueTagsText.split(",").map(t => t.trim()).filter(Boolean)
    const keywords = activationKeywordsText.split(",").map(t => t.trim()).filter(Boolean)
    const actTags = activationTagsText.split(",").map(t => t.trim()).filter(Boolean)

    let yaml = `---\n`
    yaml += `name: ${slug || "untitled-skill"}\n`
    yaml += `version: ${version || "1.0.0"}\n`
    yaml += `description: ${valueProp || ""}\n`

    if (useCases.length > 0) {
      yaml += `use_cases:\n`
      useCases.forEach((uc) => {
        yaml += `  - "${uc.replace(/"/g, '\\"')}"\n`
      })
    }

    yaml += `value_prop: "${(valueProp || "").replace(/"/g, '\\"')}"\n`

    if (valTags.length > 0) {
      yaml += `value_tags:\n`
      valTags.forEach((vt) => {
        yaml += `  - ${vt}\n`
      })
    }

    yaml += `activation:\n`
    if (keywords.length > 0) {
      yaml += `  keywords:\n`
      keywords.forEach((kw) => {
        yaml += `    - "${kw.replace(/"/g, '\\"')}"\n`
      })
    }
    if (actTags.length > 0) {
      yaml += `  tags:\n`
      actTags.forEach((at) => {
        yaml += `    - ${at}\n`
      })
    }
    yaml += `  max_context_tokens: 5000\n`
    yaml += `requires:\n`
    yaml += `  bins: []\n`
    yaml += `  env: []\n`
    yaml += `---`

    return `${yaml}\n\n${markdownContent || ""}`
  }

  const handleCopyCode = async () => {
    const code = compileSkillMarkdown()
    try {
      await navigator.clipboard.writeText(code)
      setCopiedPreview(true)
      setTimeout(() => setCopiedPreview(false), 2000)
      notify("Compiled code copied", "info")
    } catch (e) {
      console.error(e)
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()

    const valTags = valueTagsText.split(",").map(t => t.trim()).filter(Boolean)
    const keywords = activationKeywordsText.split(",").map(t => t.trim()).filter(Boolean)
    const actTags = activationTagsText.split(",").map(t => t.trim()).filter(Boolean)

    updateSubmission(submission.id, {
      title,
      version,
      valueProp,
      valueTags: valTags,
      useCases: useCases.filter(Boolean),
      activationKeywords: keywords,
      activationTags: actTags,
      markdownContent,
      visibility,
      sourceDetail: markdownContent.slice(0, 100) + (markdownContent.length > 100 ? "..." : "")
    })

    notify(`Changes saved for ${title}`)
    router.push(`/mvp/manage/${submission.id}`)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation */}
      <div>
        <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-foreground h-8 -ml-2 px-3">
          <Link href={`/mvp/manage/${submission.id}`}>
            <IconArrowLeft className="size-4" />
            Back to Item details
          </Link>
        </Button>
      </div>

      {/* Seamless unified Header Card */}
      <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm">
        <div className="space-y-1">
          <span className="text-xs font-bold tracking-widest text-primary uppercase">
            Internal Catalog
          </span>
          <h1 className="mt-0.5 font-heading text-2xl font-bold leading-tight text-foreground">
            Edit {submission.title}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            Configure YAML frontmatter attributes and draft your skill instructions guidelines.
          </p>
        </div>
      </Card>

      {/* Skill View Mode Switcher */}
      <div className="flex justify-end border-b border-[var(--ironhub-line)]/50 w-full -mb-1 animate-in fade-in duration-200">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 text-xs font-bold transition-all duration-200 -mb-[1px] ${activeTab === "edit"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            <IconEdit className="size-3.5" />
            Edit Skill
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1.5 px-4 py-2 border-b-2 text-xs font-bold transition-all duration-200 -mb-[1px] ${activeTab === "preview"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            <IconCode className="size-3.5" />
            View Skill File
          </button>
        </div>
      </div>

      {/* Main content body - full-width container switcher */}
      <div className="w-full">

        {/* Editor Form View */}
        <form onSubmit={handleSave} className="w-full flex flex-col gap-5">
          <div className={`w-full flex flex-col gap-5 ${activeTab === "edit" ? "block" : "hidden"}`}>
            <Card className="border border-[var(--ironhub-line)] bg-card/60 p-6 shadow-sm flex flex-col gap-5">
              <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                1. Frontmatter Metadata
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    System Title
                  </label>
                  <Input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-background/50 text-sm rounded-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Version
                  </label>
                  <Input
                    required
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="bg-background/50 text-sm rounded-full"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Value Proposition / Summary Description
                </label>
                <Input
                  required
                  value={valueProp}
                  onChange={(e) => setValueProp(e.target.value)}
                  placeholder="Core value or pitch of this skill..."
                  className="bg-background/50 text-sm rounded-full"
                />
              </div>

              {/* Use Cases list builder */}
              <div className="flex flex-col gap-2.5 border-t border-[var(--ironhub-line)]/50 pt-4 mt-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Key Use Cases
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddUseCase}
                    className="h-6 rounded-full text-xs px-2.5 flex items-center gap-0.5"
                  >
                    <IconPlus className="size-3" /> Add Use Case
                  </Button>
                </div>

                <div className="flex flex-col gap-2">
                  {useCases.map((uc, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        required
                        placeholder="e.g. Automate client onboarding reports..."
                        value={uc}
                        onChange={(e) => handleUseCaseChange(index, e.target.value)}
                        className="bg-background/50 text-sm flex-1 rounded-full"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveUseCase(index)}
                        className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 shrink-0"
                      >
                        <IconTrash className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  {useCases.length === 0 && (
                    <p className="text-xs text-muted-foreground italic leading-normal">
                      No use cases added yet. Click Add to define features.
                    </p>
                  )}
                </div>
              </div>

              {/* Comma tags */}
              <div className="grid gap-4 sm:grid-cols-3 border-t border-[var(--ironhub-line)]/50 pt-4 mt-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Value Tags
                  </label>
                  <Input
                    value={valueTagsText}
                    onChange={(e) => setValueTagsText(e.target.value)}
                    placeholder="Automation, Security"
                    className="bg-background/50 text-xs font-mono rounded-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Activation Keywords
                  </label>
                  <Input
                    value={activationKeywordsText}
                    onChange={(e) => setActivationKeywordsText(e.target.value)}
                    placeholder="auth, login"
                    className="bg-background/50 text-xs font-mono rounded-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Activation Tags
                  </label>
                  <Input
                    value={activationTagsText}
                    onChange={(e) => setActivationTagsText(e.target.value)}
                    placeholder="productivity"
                    className="bg-background/50 text-xs font-mono rounded-full"
                  />
                </div>
              </div>

              {/* Clean, Optimized Visibility cards inside Metadata card */}
              <div className="flex flex-col gap-2 border-t border-[var(--ironhub-line)]/50 pt-4 mt-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Visibility & Distribution
                </label>
                <div className="grid grid-cols-2 gap-3 mt-0.5 max-w-xl">
                  <button
                    type="button"
                    onClick={() => setVisibility("private")}
                    className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${visibility === "private"
                      ? "border-primary bg-primary/5 text-foreground shadow-sm"
                      : "border-[var(--ironhub-line)]/50 bg-background/30 text-muted-foreground hover:bg-muted/10"
                      }`}
                  >
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${visibility === "private" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <IconLock className="size-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Private Space</span>
                      <span className="text-xs leading-normal text-muted-foreground/80 block mt-0.5">
                        Internal to Circle Org Space only.
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility("public")}
                    className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${visibility === "public"
                      ? "border-primary bg-primary/5 text-foreground shadow-sm"
                      : "border-[var(--ironhub-line)]/50 bg-background/30 text-muted-foreground hover:bg-muted/10"
                      }`}
                  >
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${visibility === "public" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <IconWorld className="size-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">Public Hub</span>
                      <span className="text-xs leading-normal text-muted-foreground/80 block mt-0.5">
                        Promote to Open Marketplace.
                      </span>
                    </div>
                  </button>
                </div>
              </div>

            </Card>

            <Card className="border border-[var(--ironhub-line)] bg-card/60 p-6 shadow-sm flex flex-col gap-3">
              <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                2. Skill Guidelines (SKILL.MD)
              </h3>
              <textarea
                placeholder="e.g. ## Persona\n\nDescribe how the agent should act..."
                value={markdownContent}
                onChange={(e) => setMarkdownContent(e.target.value)}
                className="flex min-h-[400px] w-full rounded-2xl border border-[var(--ironhub-line)] bg-background/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
              />
            </Card>
          </div>

          {/* Read-Only Compiled Preview View */}
          <div className={`w-full flex flex-col gap-3 min-w-0 ${activeTab === "preview" ? "block" : "hidden"}`}>
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Compiled file output (SKILL.md)
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
                className="h-7 rounded-full text-xs px-2.5 flex items-center gap-1"
              >
                {copiedPreview ? (
                  <>
                    <IconCheck className="size-3 text-emerald-600" /> Copied!
                  </>
                ) : (
                  <>
                    <IconCopy className="size-3" /> Copy Code
                  </>
                )}
              </Button>
            </div>

            <div className="w-full overflow-auto max-h-[800px] border border-[var(--ironhub-line)] bg-slate-950 font-mono text-xs text-slate-300 rounded-2xl p-6 shadow-inner leading-relaxed whitespace-pre select-text selection:bg-primary/30">
              {compileSkillMarkdown()}
            </div>
          </div>

          {/* Cleaned Actions Bar (No visibility radio buttons anymore) - visible in both tabs! */}
          <div className="rounded-xl border border-[var(--ironhub-line)] bg-card/60 p-4 shadow-sm flex flex-row items-center justify-end gap-3 mt-4">
            <Button type="button" variant="outline" asChild className="rounded-full">
              <Link href={`/mvp/manage/${submission.id}`}>Cancel</Link>
            </Button>
            <Button type="submit" className="rounded-full px-6 shadow-sm">
              Save & Publish
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
