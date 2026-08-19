"use client"

import React, { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { ApiError, uploadContent } from "@/features/partner/api/client"
import {
  describeArtifactSaveError,
  useCreateArtifact,
  useInspectBundle,
  useUploadArtifactBundle,
} from "@/features/partner/api/artifacts"
import { useToast } from "@/features/partner/store/toast-provider"
import { VisibilitySelector } from "@/features/partner/components/visibility-selector"
import { CategoryAndRepoFields } from "@/features/partner/components/category-repo-fields"
import {
  FormSection,
  ViewToggle,
  WorkspacePageHeader,
} from "@/features/partner/components/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/shared/utils"
import {
  IconAlertTriangle,
  IconCheck,
  IconCode,
  IconCopy,
  IconEdit,
  IconFileZip,
  IconLoader2,
  IconPlus,
  IconSparkles,
  IconTool,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react"

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  )
}

/**
 * Prefills the artifact-name field from a manifest.toml `id`, replacing only
 * what the server's artifact-name charset (`service.ts`:
 * `/^[a-z0-9][a-z0-9_-]*$/`) actually forbids. Unlike `slugify()` above —
 * which is fine for deriving a name from a free-typed human title — this
 * must NOT collapse `_`, since underscores are legal in both the manifest-id
 * charset (D6 rule 8) and the artifact-name charset. Only `.` and other
 * truly illegal characters get replaced.
 */
function sanitizeArtifactName(id: string) {
  const cleaned = id
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
  return cleaned || "item"
}

export default function NewSubmitPage() {
  const router = useRouter()
  const { notify } = useToast()
  const queryClient = useQueryClient()
  const createArtifact = useCreateArtifact()
  const inspectBundle = useInspectBundle()
  const uploadArtifactBundle = useUploadArtifactBundle()

  // High-level type selector: default to "skill" first!
  const [type, setType] = useState<"tool" | "skill">("skill")

  // Common form states
  const [title, setTitle] = useState("")
  const [version, setVersion] = useState("1.0.0")
  const [visibility, setVisibility] = useState<"public" | "private">("private")
  const [category, setCategory] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [sourceUrlError, setSourceUrlError] = useState<string | null>(null)

  // Tool specific states
  const [description, setDescription] = useState("")
  const [artifactName, setArtifactName] = useState("")
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [inspectedManifest, setInspectedManifest] = useState<{
    name: string
    id: string
    version: string
    description: string
  } | null>(null)
  const [bundleError, setBundleError] = useState<string | null>(null)
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

  // Submission progress / errors
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<
    Record<string, "pending" | "uploading" | "done" | "error">
  >({})

  // Bumped on every zip selection so a slow-to-resolve inspect from a
  // previously selected file can't overwrite state after a faster-resolving
  // later selection — only the most recent request's result is applied.
  const inspectRequestIdRef = useRef(0)

  const resetToolBundleState = () => {
    inspectRequestIdRef.current += 1
    setZipFile(null)
    setInspectedManifest(null)
    setBundleError(null)
    setArtifactName("")
  }

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
    const valTags = valueTagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    const keywords = activationKeywordsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    const actTags = activationTagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)

    const slug = slugify(title || "untitled-skill")

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

  // Drag and drop handlers for the extension bundle zip
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const acceptZipFile = async (file: File) => {
    const requestId = ++inspectRequestIdRef.current
    setBundleError(null)
    setInspectedManifest(null)

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setBundleError("Only .zip archives are accepted.")
      setZipFile(null)
      return
    }

    setZipFile(file)

    try {
      const result = await inspectBundle.mutateAsync(file)
      // A newer selection was made while this inspect was in flight —
      // discard this stale result so it can't overwrite the newer one.
      if (inspectRequestIdRef.current !== requestId) return
      setInspectedManifest(result.manifest)
      setTitle(result.manifest.name)
      // manifest.toml `id` (D6 rule 8) allows `.` alongside lowercase
      // alphanumerics and `_`/`-` — the artifact-name charset allows `_`/`-`
      // but not `.`. Only strip what's actually illegal for this field, so
      // e.g. "acme.firecrawl_tool" becomes "acme-firecrawl_tool", not a
      // fully slugified name that would also destroy the legal underscore.
      // The manifest's own `id` is left untouched in the stored file.
      setArtifactName(sanitizeArtifactName(result.manifest.id))
      setVersion(result.manifest.version)
      setDescription(result.manifest.description)
      notify(`Inspected package: ${file.name}`, "info")
    } catch (error) {
      if (inspectRequestIdRef.current !== requestId) return
      setBundleError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to inspect archive."
      )
      setInspectedManifest(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void acceptZipFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void acceptZipFile(file)
  }

  const bundleReadyForSubmit = Boolean(
    zipFile && inspectedManifest && !bundleError
  )

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setCategoryError(null)
    setSourceUrlError(null)

    if (type === "tool" && !bundleReadyForSubmit) {
      setFormError(
        "Upload and inspect a valid extension .zip before submitting."
      )
      return
    }

    const finalTitle =
      title ||
      (type === "skill"
        ? "Untitled Skill"
        : inspectedManifest?.name || "Uploaded Tool")
    const name =
      type === "tool"
        ? artifactName || slugify(finalTitle)
        : slugify(finalTitle)

    setIsSubmitting(true)
    setUploadStatus({})

    let createdArtifactId: string | null = null

    try {
      const { artifact } = await createArtifact.mutateAsync({
        type,
        name,
        title: finalTitle,
        version: version || "1.0.0",
        visibility,
        description: type === "tool" ? description : valueProp,
        category: category || null,
        // Unlike edit forms (which must be able to send an explicit `null`
        // to clear an existing value), create has nothing to clear — an
        // absent key and a stored `null` are equivalent here.
        sourceUrl: sourceUrl.trim() || undefined,
      })
      createdArtifactId = artifact.id

      if (type === "tool") {
        // Unreachable in practice — the submit button is disabled unless
        // bundleReadyForSubmit (which requires zipFile) is true — but this
        // narrows the type properly instead of asserting it with a cast.
        if (!zipFile) {
          throw new Error("No archive selected.")
        }
        setUploadStatus((prev) => ({ ...prev, bundle: "uploading" }))
        try {
          await uploadArtifactBundle.mutateAsync({
            id: artifact.id,
            bytes: zipFile,
          })
          setUploadStatus((prev) => ({ ...prev, bundle: "done" }))
        } catch (uploadError) {
          setUploadStatus((prev) => ({ ...prev, bundle: "error" }))
          throw uploadError
        }
      } else {
        setUploadStatus((prev) => ({ ...prev, skill_md: "uploading" }))
        try {
          // The freshly-created artifact id isn't known until this point, so
          // this uses the raw client helper rather than a bound mutation hook.
          await uploadContent(
            `/api/private-artifacts/${artifact.id}/content/skill_md`,
            new Blob([compileSkillMarkdown()], { type: "text/markdown" })
          )
          setUploadStatus((prev) => ({ ...prev, skill_md: "done" }))
        } catch (uploadError) {
          setUploadStatus((prev) => ({ ...prev, skill_md: "error" }))
          throw uploadError
        }
      }

      // The skill_md path went through the raw client helper (not a React
      // Query mutation hook), so the artifacts list cache is stale until we
      // invalidate it explicitly. (The tool/bundle path already invalidated
      // via useUploadArtifactBundle's onSuccess — this is a harmless no-op
      // refetch for that case.)
      queryClient.invalidateQueries({ queryKey: ["private-artifacts"] })

      notify(`Created ${type}: ${finalTitle}`)
      router.push("/mvp/dashboard")
    } catch (error) {
      if (createdArtifactId) {
        // The artifact row was created but the content upload failed partway
        // through. Retrying "Add to Space" as-is would just 409 on the
        // name+version we already claimed, so send the user to the manage
        // page to finish the upload instead of leaving them stuck on a
        // dead-end form. Surface the server's actual reason rather than a
        // generic sentence — a 400 from re-validation, a 413, or a 409 all
        // deserve to be seen.
        notify(
          `${finalTitle} was created, but the upload failed: ${describeArtifactSaveError(error).message} Finish the upload from the item's Manage page.`,
          "error"
        )
        queryClient.invalidateQueries({ queryKey: ["private-artifacts"] })
        router.push(`/mvp/manage/${createdArtifactId}`)
      } else {
        const described = describeArtifactSaveError(error)
        if (described.field === "category") setCategoryError(described.message)
        else if (described.field === "sourceUrl")
          setSourceUrlError(described.message)
        else setFormError(described.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitHint =
    type !== "tool"
      ? null
      : inspectBundle.isPending
        ? "Checking your package…"
        : bundleError
          ? "Fix the problem with your package above to continue"
          : !bundleReadyForSubmit
            ? "Upload a tool package to continue"
            : null

  return (
    <div className="flex flex-col gap-6 pb-12">
      <WorkspacePageHeader
        backHref="/mvp/dashboard"
        backLabel="Back to dashboard"
        title="Add a skill or tool"
        description="Create a skill from instructions you write, or upload a packaged tool as a .zip file."
      />

      {formError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm font-normal text-destructive"
        >
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Step 1: What you are adding */}
        <FormSection
          step={1}
          title="What you are adding"
          description="Choose whether you are creating a skill or a packaged tool."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={type === "skill"}
              onClick={() => {
                setType("skill")
                setTitle("")
                setVersion("1.0.0")
                setActiveTab("edit")
                setFormError(null)
                setCategoryError(null)
                setSourceUrlError(null)
                resetToolBundleState()
              }}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                type === "skill"
                  ? "border-primary bg-primary/5"
                  : "border-[var(--ironhub-line)] bg-background/30 hover:bg-muted/30"
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  type === "skill"
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <IconSparkles className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">
                  Skill
                </span>
                <span className="mt-1 block text-sm leading-snug text-muted-foreground">
                  Instructions you write that tell an assistant how to do
                  something. Nothing to upload.
                </span>
              </span>
            </button>

            <button
              type="button"
              aria-pressed={type === "tool"}
              onClick={() => {
                setType("tool")
                setTitle("")
                setVersion("1.0.0")
                setActiveTab("edit")
                setFormError(null)
                setCategoryError(null)
                setSourceUrlError(null)
                resetToolBundleState()
              }}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                type === "tool"
                  ? "border-primary bg-primary/5"
                  : "border-[var(--ironhub-line)] bg-background/30 hover:bg-muted/30"
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  type === "tool"
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <IconTool className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">
                  Tool
                </span>
                <span className="mt-1 block text-sm leading-snug text-muted-foreground">
                  A packaged program you upload as a .zip file.
                </span>
              </span>
            </button>
          </div>
        </FormSection>

        {type === "skill" ? (
          <>
            {/* SKILL Step 2: Basics */}
            <FormSection
              step={2}
              title="Basics"
              description="Name, version and how people find this skill."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="skill-name"
                    className="text-sm font-medium text-foreground"
                  >
                    Skill name
                  </label>
                  <Input
                    id="skill-name"
                    aria-describedby="skill-name-help"
                    required
                    placeholder="e.g. Invoice Auditor"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-10 min-h-[40px] rounded-lg bg-background/50 text-sm"
                  />
                  <p
                    id="skill-name-help"
                    className="text-xs text-muted-foreground"
                  >
                    The name members see in the catalog. We create a short
                    identifier from it automatically.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="skill-version"
                    className="text-sm font-medium text-foreground"
                  >
                    Version
                  </label>
                  <Input
                    id="skill-version"
                    aria-describedby="skill-version-help"
                    required
                    placeholder="e.g. 1.0.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="h-10 min-h-[40px] rounded-lg bg-background/50 text-sm"
                  />
                  <p
                    id="skill-version-help"
                    className="text-xs text-muted-foreground"
                  >
                    Your own version number, for example 1.0.0. This cannot be
                    changed later.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="skill-description"
                  className="text-sm font-medium text-foreground"
                >
                  Short description
                </label>
                <Input
                  id="skill-description"
                  aria-describedby="skill-description-help"
                  required
                  value={valueProp}
                  onChange={(e) => setValueProp(e.target.value)}
                  placeholder="Core value or pitch of this skill..."
                  className="h-10 min-h-[40px] rounded-lg bg-background/50 text-sm"
                />
                <p
                  id="skill-description-help"
                  className="text-xs text-muted-foreground"
                >
                  One line explaining what this does.
                </p>
              </div>

              <CategoryAndRepoFields
                category={category}
                onCategoryChange={setCategory}
                categoryError={categoryError}
                sourceUrl={sourceUrl}
                onSourceUrlChange={setSourceUrl}
                sourceUrlError={sourceUrlError}
              />

              {/* Key Use Cases */}
              <div className="flex flex-col gap-2.5 border-t border-[var(--ironhub-line)] pt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-sm font-medium text-foreground">
                      What it&apos;s for
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Examples of what someone would use this skill for.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddUseCase}
                    className="h-10 min-h-[40px] gap-1 rounded-lg px-3 text-sm"
                  >
                    <IconPlus className="size-3.5" aria-hidden="true" />
                    <span>Add use case</span>
                  </Button>
                </div>

                <div className="flex flex-col gap-2">
                  {useCases.map((uc, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        required
                        aria-label={`Use case ${index + 1}`}
                        placeholder="e.g. Automate client onboarding reports..."
                        value={uc}
                        onChange={(e) =>
                          handleUseCaseChange(index, e.target.value)
                        }
                        className="h-10 min-h-[40px] flex-1 rounded-lg bg-background/50 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveUseCase(index)}
                        aria-label="Remove use case"
                        className="size-10 min-h-[40px] min-w-[40px] shrink-0 rounded-lg text-destructive hover:bg-destructive/10"
                      >
                        <IconTrash className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                  {useCases.length === 0 && (
                    <p className="text-sm leading-normal text-muted-foreground">
                      No examples yet.
                    </p>
                  )}
                </div>
              </div>

              {/* Tag Grid */}
              <div className="grid gap-4 border-t border-[var(--ironhub-line)] pt-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="skill-topics"
                    className="text-sm font-medium text-foreground"
                  >
                    Topics
                  </label>
                  <Input
                    id="skill-topics"
                    aria-describedby="skill-topics-help"
                    value={valueTagsText}
                    onChange={(e) => setValueTagsText(e.target.value)}
                    placeholder="Automation, Security"
                    className="h-10 min-h-[40px] rounded-lg bg-background/50 text-sm"
                  />
                  <p
                    id="skill-topics-help"
                    className="text-xs text-muted-foreground"
                  >
                    What this skill is about. Used for browsing and search.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="skill-trigger-words"
                    className="text-sm font-medium text-foreground"
                  >
                    Trigger words
                  </label>
                  <Input
                    id="skill-trigger-words"
                    aria-describedby="skill-trigger-words-help"
                    value={activationKeywordsText}
                    onChange={(e) => setActivationKeywordsText(e.target.value)}
                    placeholder="auth, login"
                    className="h-10 min-h-[40px] rounded-lg bg-background/50 text-sm"
                  />
                  <p
                    id="skill-trigger-words-help"
                    className="text-xs text-muted-foreground"
                  >
                    Words in a request that should bring this skill in.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="skill-trigger-topics"
                    className="text-sm font-medium text-foreground"
                  >
                    Trigger topics
                  </label>
                  <Input
                    id="skill-trigger-topics"
                    aria-describedby="skill-trigger-topics-help"
                    value={activationTagsText}
                    onChange={(e) => setActivationTagsText(e.target.value)}
                    placeholder="productivity"
                    className="h-10 min-h-[40px] rounded-lg bg-background/50 text-sm"
                  />
                  <p
                    id="skill-trigger-topics-help"
                    className="text-xs text-muted-foreground"
                  >
                    Broader subjects that should bring this skill in.
                  </p>
                </div>
              </div>
            </FormSection>

            {/* SKILL Step 3: Instructions */}
            <FormSection
              step={3}
              title="Instructions"
              description="What the assistant should do when this skill runs."
              action={
                <ViewToggle
                  value={activeTab}
                  onChange={setActiveTab}
                  options={[
                    { value: "edit", label: "Write", icon: IconEdit },
                    { value: "preview", label: "Preview file", icon: IconCode },
                  ]}
                  label="Instructions view"
                />
              }
            >
              {activeTab === "edit" ? (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="skill-markdown" className="sr-only">
                    Instructions for the assistant
                  </label>
                  <textarea
                    id="skill-markdown"
                    required={type === "skill" && activeTab === "edit"}
                    placeholder={`## Persona

Describe how the agent should act...`}
                    value={markdownContent}
                    onChange={(e) => setMarkdownContent(e.target.value)}
                    className="flex min-h-[300px] w-full rounded-lg border border-[var(--ironhub-line)] bg-background/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
                  />
                </div>
              ) : (
                <div className="flex min-w-0 flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      Preview of the file we will create
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyCode}
                      className="h-10 min-h-[40px] gap-1.5 rounded-lg px-3 text-sm"
                    >
                      {copiedPreview ? (
                        <>
                          <IconCheck
                            className="size-3.5 text-emerald-600 dark:text-emerald-400"
                            aria-hidden="true"
                          />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <IconCopy className="size-3.5" aria-hidden="true" />
                          <span>Copy code</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="max-h-[600px] w-full min-w-0 overflow-auto rounded-xl border border-[var(--ironhub-line)] bg-muted/40 p-4 font-mono text-sm leading-relaxed whitespace-pre text-foreground select-text selection:bg-primary/30">
                    {compileSkillMarkdown()}
                  </div>
                </div>
              )}
            </FormSection>

            {/* SKILL Step 4: Who can see it */}
            <FormSection
              step={4}
              title="Who can see it"
              description="Choose who can find and use this skill."
            >
              <VisibilitySelector
                visibility={visibility}
                onChange={setVisibility}
              />
            </FormSection>
          </>
        ) : (
          <>
            {/* TOOL Step 2: Tool package */}
            <FormSection
              step={2}
              title="Tool package"
              description="Upload the .zip you were given for this tool. It should contain the program file and its setup details."
            >
              <div className="flex flex-col gap-2">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "relative flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/40",
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-[var(--ironhub-line)] bg-background/30 hover:border-primary/50"
                  )}
                >
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    aria-label="Choose a .zip tool package"
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                  />
                  <IconUpload
                    className={cn(
                      "size-6",
                      dragOver ? "text-primary" : "text-muted-foreground"
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "mt-2 block text-sm font-medium",
                      dragOver ? "text-primary" : "text-foreground"
                    )}
                  >
                    {dragOver
                      ? "Drop to upload"
                      : "Drag a .zip file here, or click to choose one"}
                  </span>
                </div>

                {inspectBundle.isPending && (
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--ironhub-line)]/50 bg-background/30 p-3 text-xs font-medium text-muted-foreground">
                    <IconLoader2
                      className="size-4 shrink-0 animate-spin text-primary"
                      aria-hidden="true"
                    />
                    <span>Inspecting archive...</span>
                  </div>
                )}

                {bundleError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm font-normal text-destructive"
                  >
                    <IconAlertTriangle
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{bundleError}</span>
                  </div>
                )}

                {zipFile && bundleReadyForSubmit && (
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3 text-xs font-medium",
                      uploadStatus.bundle === "error"
                        ? "border-destructive/30 bg-destructive/5 text-destructive"
                        : "border-emerald-500/20 bg-emerald-500/5 text-foreground"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      <IconFileZip
                        className={cn(
                          "size-4 shrink-0",
                          uploadStatus.bundle === "error"
                            ? "text-destructive"
                            : "text-emerald-600 dark:text-emerald-400"
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{zipFile.name}</span>
                    </span>
                    <span
                      className={cn(
                        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium",
                        uploadStatus.bundle === "error"
                          ? "border-destructive/30 bg-destructive/10 text-destructive"
                          : "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400"
                      )}
                    >
                      <span
                        className="size-1.5 rounded-full bg-current"
                        aria-hidden="true"
                      />
                      <span>
                        {uploadStatus.bundle === "uploading"
                          ? "Uploading..."
                          : uploadStatus.bundle === "done"
                            ? "Uploaded"
                            : uploadStatus.bundle === "error"
                              ? "Upload failed"
                              : "Inspected"}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </FormSection>

            {/* TOOL Step 3: Basics */}
            <FormSection
              step={3}
              title="Basics"
              description="Name, version and how people find this tool."
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="tool-name"
                    className="text-sm font-medium text-foreground"
                  >
                    Tool name
                  </label>
                  <Input
                    id="tool-name"
                    aria-describedby="tool-name-help"
                    required
                    placeholder="e.g. USDC Payments"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-10 min-h-[40px] rounded-lg bg-background/50 text-sm"
                  />
                  <p
                    id="tool-name-help"
                    className="text-xs text-muted-foreground"
                  >
                    The name members see in the catalog.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="tool-artifact-name"
                    className="text-sm font-medium text-foreground"
                  >
                    Identifier
                  </label>
                  <Input
                    id="tool-artifact-name"
                    aria-describedby="tool-artifact-name-help"
                    required
                    placeholder="e.g. usdc-payments"
                    value={artifactName}
                    onChange={(e) => setArtifactName(e.target.value)}
                    className="h-10 min-h-[40px] rounded-lg bg-background/50 text-sm"
                  />
                  <p
                    id="tool-artifact-name-help"
                    className="text-xs text-muted-foreground"
                  >
                    A short lowercase name used in links and commands, for
                    example usdc-payments. This cannot be changed later.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="tool-version"
                    className="text-sm font-medium text-foreground"
                  >
                    Version
                  </label>
                  <Input
                    id="tool-version"
                    aria-describedby="tool-version-help"
                    required
                    placeholder="e.g. 1.0.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="h-10 min-h-[40px] rounded-lg bg-background/50 text-sm"
                  />
                  <p
                    id="tool-version-help"
                    className="text-xs text-muted-foreground"
                  >
                    Your own version number, for example 1.0.0. This cannot be
                    changed later.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="tool-description"
                  className="text-sm font-medium text-foreground"
                >
                  Short description
                </label>
                <textarea
                  id="tool-description"
                  aria-describedby="tool-description-help"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide a description of the tool capabilities..."
                  className="flex min-h-[100px] w-full rounded-lg border border-[var(--ironhub-line)] bg-background/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
                />
                <p
                  id="tool-description-help"
                  className="text-xs text-muted-foreground"
                >
                  One line explaining what this tool does.
                </p>
              </div>

              <CategoryAndRepoFields
                category={category}
                onCategoryChange={setCategory}
                categoryError={categoryError}
                sourceUrl={sourceUrl}
                onSourceUrlChange={setSourceUrl}
                sourceUrlError={sourceUrlError}
              />
            </FormSection>

            {/* TOOL Step 4: Who can see it */}
            <FormSection
              step={4}
              title="Who can see it"
              description="Choose who can find and use this tool."
            >
              <VisibilitySelector
                visibility={visibility}
                onChange={setVisibility}
              />
            </FormSection>
          </>
        )}

        {/* Sticky submit bar: one surface (bg-card) and the single raised overlay
            step (shadow-lg, same as Dialog/Sheet) in both themes — the resting
            --ironhub-shadow used by FormSection is too weak for a bar that floats
            over those cards.
            pr-16 on small screens reserves the corner so buttons do not sit under the floating scroll-to-top button. */}
        <div className="sticky bottom-4 z-20 rounded-xl border border-[var(--ironhub-line)] bg-card p-4 pr-16 shadow-lg lg:pr-4">
          <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            {submitHint && (
              <p className="text-sm text-muted-foreground">{submitHint}</p>
            )}
            <div className="flex items-center justify-end gap-3 sm:ml-auto">
              <Button
                type="button"
                variant="outline"
                asChild
                className="h-10 min-h-[40px] rounded-lg px-4"
              >
                <Link href="/mvp/dashboard">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  (type === "tool" &&
                    (!bundleReadyForSubmit || inspectBundle.isPending))
                }
                className="h-10 min-h-[40px] rounded-lg px-6"
              >
                {isSubmitting && (
                  <IconLoader2 className="size-4 animate-spin" />
                )}
                <span>Add to space</span>
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
