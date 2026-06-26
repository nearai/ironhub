"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePartnerStore } from "@/features/partner/store/partner-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  IconArrowLeft,
  IconUpload,
  IconFileZip,
  IconLock,
  IconWorld,
  IconPlus,
  IconTrash,
  IconTool,
  IconSparkles,
  IconEdit,
  IconCode,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react"

export default function NewSubmitPage() {
  const router = useRouter()
  const { addSubmission, notify } = usePartnerStore()

  // High-level type selector: default to "skill" first!
  const [type, setType] = useState<"tool" | "skill">("skill")

  // Common form states
  const [title, setTitle] = useState("")
  const [version, setVersion] = useState("1.0.0")
  const [visibility, setVisibility] = useState<"public" | "private">("private")

  // Tool specific states
  const [description, setDescription] = useState("")
  const [zipFile, setZipFile] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Skill specific states
  const [valueProp, setValueProp] = useState("")
  const [valueTagsText, setValueTagsText] = useState("")
  const [activationKeywordsText, setActivationKeywordsText] = useState("")
  const [activationTagsText, setActivationTagsText] = useState("")
  const [useCases, setUseCases] = useState<string[]>([])
  const [markdownContent, setMarkdownContent] = useState("")

  // Tab state for Skill creation (Edit vs Preview)
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")
  const [copiedPreview, setCopiedPreview] = useState(false)

  // Handlers for Skill Use Cases list
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

  // Compile SKILL.md Markdown format reactively
  const compileSkillMarkdown = () => {
    const valTags = valueTagsText.split(",").map(t => t.trim()).filter(Boolean)
    const keywords = activationKeywordsText.split(",").map(t => t.trim()).filter(Boolean)
    const actTags = activationTagsText.split(",").map(t => t.trim()).filter(Boolean)

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled-skill"

    let yaml = `---\n`
    yaml += `name: ${slug}\n`
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

  // Drag and drop handlers for Tool ZIP
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith(".zip") || file.name.endsWith(".wasm"))) {
      setZipFile(file.name)
      if (!title) {
        const cleanName = file.name.replace(".zip", "").replace(".wasm", "")
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1))
      }
      notify(`Selected package: ${file.name}`, "info")
    } else {
      notify("Only .zip or .wasm files are accepted", "error")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && (file.name.endsWith(".zip") || file.name.endsWith(".wasm"))) {
      setZipFile(file.name)
      if (!title) {
        const cleanName = file.name.replace(".zip", "").replace(".wasm", "")
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1))
      }
      notify(`Selected package: ${file.name}`, "info")
    } else {
      notify("Only .zip or .wasm files are accepted", "error")
    }
  }

  // Form submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const finalTitle = title || (type === "skill" ? "Untitled Skill" : zipFile?.replace(".zip", "").replace(".wasm", "") || "Uploaded Package")

    if (type === "skill") {
      const valTags = valueTagsText.split(",").map(t => t.trim()).filter(Boolean)
      const keywords = activationKeywordsText.split(",").map(t => t.trim()).filter(Boolean)
      const actTags = activationTagsText.split(",").map(t => t.trim()).filter(Boolean)

      addSubmission({
        type: "skill",
        title: finalTitle,
        version: version || "1.0.0",
        visibility,
        sourceType: "prompt",
        sourceDetail: markdownContent.slice(0, 100) + (markdownContent.length > 100 ? "..." : ""),
        useCases: useCases.filter(Boolean),
        valueProp,
        valueTags: valTags,
        activationKeywords: keywords,
        activationTags: actTags,
        markdownContent,
        status: "in_review",
      })

      notify(`Created skill: ${finalTitle}`)
    } else {
      addSubmission({
        type: "tool",
        title: finalTitle,
        version: version || "1.0.0",
        visibility,
        sourceType: "upload",
        sourceDetail: zipFile || "package.zip",
        valueProp: description,
        status: "in_review",
      })

      notify(`Created tool: ${finalTitle}`)
    }

    router.push("/mvp/dashboard")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation */}
      <div>
        <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-foreground h-8 -ml-2 px-3">
          <Link href="/mvp/dashboard">
            <IconArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      {/* Seamless unified Header Card */}
      <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold tracking-widest text-primary uppercase">
              Internal Catalog
            </span>
            <h1 className="mt-0.5 font-heading text-2xl font-bold leading-tight text-foreground">
              Add new Item
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
              Register a new custom AI prompt-based skill or packaged WASM tool for your organization catalog.
            </p>
          </div>

          {/* Type Switcher */}
          <div className="flex rounded-full border border-[var(--ironhub-line)] p-1 bg-muted/20 shrink-0 self-start md:self-center">
            <button
              type="button"
              onClick={() => {
                setType("skill")
                setTitle("")
                setVersion("1.0.0")
                setActiveTab("edit")
              }}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${type === "skill"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <IconSparkles className="size-3.5" />
              Create Skill
            </button>
            <button
              type="button"
              onClick={() => {
                setType("tool")
                setTitle("")
                setVersion("1.0.0")
                setActiveTab("edit")
              }}
              className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${type === "tool"
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <IconTool className="size-3.5" />
              Create Tool
            </button>
          </div>
        </div>
      </Card>

      {/* Form Submission */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">

        {type === "tool" ? (
          /* TOOL FORM SETUP */
          <Card className="border border-[var(--ironhub-line)] bg-card/60 p-6 shadow-sm flex flex-col gap-5">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              1. Tool Metadata
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Skill Name
                </label>
                <Input
                  required
                  placeholder="e.g. USDC Payments"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-background/50 text-sm rounded-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Version Code / Tag
                </label>
                <Input
                  required
                  placeholder="e.g. 1.0.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="bg-background/50 text-sm rounded-full"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">
                Description / Value Proposition
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a description of the tool capabilities..."
                className="flex min-h-[100px] w-full rounded-2xl border border-[var(--ironhub-line)] bg-background/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
              />
            </div>

            {/* ZIP Dropzone */}
            <div className="flex flex-col gap-2 border-t border-[var(--ironhub-line)]/50 pt-4 mt-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">
                Tool File Package (.zip / .wasm)
              </label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${dragOver
                  ? "border-primary bg-primary/5"
                  : "border-[var(--ironhub-line)] bg-background/30 hover:border-primary/50"
                  }`}
              >
                <input
                  type="file"
                  accept=".zip,.wasm"
                  onChange={handleFileChange}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <IconUpload className="size-6 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground mt-2 block">
                  Drag new ZIP or WASM file here, or click to browse
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  Supports .zip and .wasm packages up to 50MB
                </span>
              </div>

              {zipFile && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-foreground font-semibold mt-1">
                  <span className="flex items-center gap-1.5">
                    <IconFileZip className="size-4 text-emerald-600" />
                    {zipFile}
                  </span>
                  <span className="text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase font-bold">
                    Ready
                  </span>
                </div>
              )}
            </div>

            {/* Visibility Selection blocks */}
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

            {/* Cleaned Actions Bar */}
            <div className="rounded-xl border border-[var(--ironhub-line)] bg-card/60 p-4 shadow-sm flex flex-row items-center justify-end gap-3">
              <Button type="button" variant="outline" asChild className="rounded-full">
                <Link href="/mvp/dashboard">Cancel</Link>
              </Button>
              <Button type="submit" className="rounded-full px-6 shadow-sm">
                Add to Space
              </Button>
            </div>
          </Card>
        ) : (
          /* SKILL FORM SETUP */
          <>

            {/* Skill View Mode Switcher */}
            <div className="flex justify-end border-b border-[var(--ironhub-line)]/50 w-full mb-3 animate-in fade-in duration-200">
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

            {/* Form Fields view when activeTab is edit */}
            <div className={`w-full flex flex-col gap-5 ${activeTab === "edit" ? "block" : "hidden"}`}>

              <Card className="border border-[var(--ironhub-line)] bg-card/60 p-6 shadow-sm flex flex-col gap-5">



                <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  1. Frontmatter Metadata
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">
                      Skill Name
                    </label>
                    <Input
                      required
                      placeholder="e.g. Invoice Auditor"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="bg-background/50 text-sm rounded-full"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">
                      Version Code / Tag
                    </label>
                    <Input
                      required
                      placeholder="e.g. 1.0.0"
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

                {/* Visibility Selection blocks */}
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
                  required={type === "skill" && activeTab === "edit"}
                  placeholder="e.g. ## Persona\n\nDescribe how the agent should act..."
                  value={markdownContent}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                  className="flex min-h-[300px] w-full rounded-2xl border border-[var(--ironhub-line)] bg-background/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
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

              <div className="w-full overflow-auto max-h-[600px] border border-[var(--ironhub-line)] bg-slate-950 font-mono text-xs text-slate-300 rounded-2xl p-6 shadow-inner leading-relaxed whitespace-pre select-text selection:bg-primary/30">
                {compileSkillMarkdown()}
              </div>
            </div>

            {/* Cleaned Actions Bar - Visible in both edit and preview tabs */}
            <div className="rounded-xl border border-[var(--ironhub-line)] bg-card/60 p-4 shadow-sm flex flex-row items-center justify-end gap-3 mt-4">
              <Button type="button" variant="outline" asChild className="rounded-full">
                <Link href="/mvp/dashboard">Cancel</Link>
              </Button>
              <Button type="submit" className="rounded-full px-6 shadow-sm">
                Add to Space
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
