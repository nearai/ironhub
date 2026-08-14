"use client"

import React, { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useArtifact, useUpdateArtifact, useUploadArtifactContent } from "@/features/partner/api/artifacts"
import { ApiError } from "@/features/partner/api/client"
import { useToast } from "@/features/partner/store/toast-provider"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  IconArrowLeft,
  IconCopy,
  IconCheck,
  IconLock,
  IconWorld,
  IconEdit,
  IconCode,
  IconLoader2,
} from "@tabler/icons-react"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditSkillPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { notify } = useToast()
  const { data: artifact, isLoading, isError } = useArtifact(id)
  const updateArtifact = useUpdateArtifact(id)
  const uploadContent = useUploadArtifactContent(id)

  // Form states
  const [title, setTitle] = useState("")
  const [valueProp, setValueProp] = useState("")
  const [markdownContent, setMarkdownContent] = useState("")
  const [visibility, setVisibility] = useState<"public" | "private">("private")
  const [formError, setFormError] = useState<string | null>(null)

  // UI state
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")
  const [copiedPreview, setCopiedPreview] = useState(false)

  useEffect(() => {
    if (artifact) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(artifact.title)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValueProp(artifact.description || "")
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisibility(artifact.visibility)
    }
  }, [artifact])

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading skill...</div>
  }

  if (isError || !artifact || artifact.type !== "skill") {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-bold text-foreground">Skill not found</h3>
        <Button asChild variant="link" className="mt-2">
          <Link href="/mvp/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    )
  }

  const compileSkillMarkdown = () => {
    let yaml = `---\n`
    yaml += `name: ${artifact.name}\n`
    yaml += `version: ${artifact.version}\n`
    yaml += `description: ${valueProp}\n`
    yaml += `value_prop: "${valueProp.replace(/"/g, '\\"')}"\n`
    yaml += `---`

    return `${yaml}\n\n${markdownContent || ""}`
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(compileSkillMarkdown())
      setCopiedPreview(true)
      setTimeout(() => setCopiedPreview(false), 2000)
      notify("Compiled code copied", "info")
    } catch (e) {
      console.error(e)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    try {
      await updateArtifact.mutateAsync({ title, description: valueProp, visibility })
      await uploadContent.mutateAsync({
        kind: "skill_md",
        file: new Blob([compileSkillMarkdown()], { type: "text/markdown" }),
      })
      notify(`Changes saved for ${title}`)
      router.push(`/mvp/manage/${id}`)
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.status === 409 ? `Duplicate: ${error.message}` : error.message)
      } else {
        setFormError(error instanceof Error ? error.message : "Failed to save changes.")
      }
    }
  }

  const isSaving = updateArtifact.isPending || uploadContent.isPending

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-foreground h-8 -ml-2 px-3">
          <Link href={`/mvp/manage/${id}`}>
            <IconArrowLeft className="size-4" />
            Back to Item details
          </Link>
        </Button>
      </div>

      <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm">
        <div className="space-y-1">
          <h1 className="mt-0.5 font-heading text-2xl font-bold leading-tight text-foreground">
            Edit {artifact.title}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            Update the skill description and instructions. Saving re-uploads the full SKILL.md content.
          </p>
        </div>
      </Card>

      {formError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs font-semibold text-destructive">
          {formError}
        </div>
      )}

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

      <div className="w-full">
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
                  <Input disabled value={artifact.version} className="bg-muted/30 text-sm rounded-full" />
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
                        Internal to your Org Space only.
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
              <p className="text-xs text-muted-foreground">
                Existing package content isn&apos;t re-downloaded into this editor — enter the full
                instructions body below; saving replaces the stored SKILL.md.
              </p>
              <textarea
                placeholder="## Persona&#10;&#10;Describe how the agent should act..."
                value={markdownContent}
                onChange={(e) => setMarkdownContent(e.target.value)}
                className="flex min-h-[400px] w-full rounded-2xl border border-[var(--ironhub-line)] bg-background/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
              />
            </Card>
          </div>

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

          <div className="rounded-xl border border-[var(--ironhub-line)] bg-card/60 p-4 shadow-sm flex flex-row items-center justify-end gap-3 mt-4">
            <Button type="button" variant="outline" asChild className="rounded-full">
              <Link href={`/mvp/manage/${id}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSaving} className="rounded-full px-6 shadow-sm">
              {isSaving && <IconLoader2 className="size-4 animate-spin" />}
              Save & Publish
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
