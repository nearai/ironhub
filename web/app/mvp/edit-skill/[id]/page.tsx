"use client"

import React, { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useArtifact, useUpdateArtifact, useUploadArtifactContent } from "@/features/partner/api/artifacts"
import { useArtifactTextContent } from "@/features/partner/api/artifact-content"
import { ApiError } from "@/features/partner/api/client"
import { useToast } from "@/features/partner/store/toast-provider"
import { parseSkillMd, serializeSkillMd } from "@/lib/private-artifacts/skill-md"
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
  IconAlertTriangle,
} from "@tabler/icons-react"

interface PageProps {
  params: Promise<{ id: string }>
}

// design.md D5: string[] frontmatter values are edited as newline- or
// comma-separated text and split back into arrays on save.
function splitList(text: string, separator: RegExp) {
  return text
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean)
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

export default function EditSkillPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { notify } = useToast()
  const { data: artifact, isLoading, isError } = useArtifact(id)
  const updateArtifact = useUpdateArtifact(id)
  const uploadContent = useUploadArtifactContent(id)
  // Owner-facing content read (design.md D4) -- the fix for this page's bug
  // starts here: without this, the editor never sees the stored SKILL.md at
  // all, so a save has nothing to preserve.
  const skillContent = useArtifactTextContent(id, "skill_md")

  // Form states
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [valueProp, setValueProp] = useState("")
  const [useCasesText, setUseCasesText] = useState("")
  const [valueTagsText, setValueTagsText] = useState("")
  const [activationKeywordsText, setActivationKeywordsText] = useState("")
  const [activationTagsText, setActivationTagsText] = useState("")
  const [markdownContent, setMarkdownContent] = useState("")
  const [visibility, setVisibility] = useState<"public" | "private">("private")
  const [formError, setFormError] = useState<string | null>(null)

  // Full frontmatter map as parsed from the stored file (design.md D5). The
  // form only exposes name/version/description/value_prop/use_cases/
  // value_tags/activation.keywords/activation.tags -- every other key here
  // is passed through untouched by serializeSkillMd on save. State (not a
  // ref) because it's read during render to build the "View Skill File"
  // preview.
  const [baseFrontmatter, setBaseFrontmatter] = useState<Record<string, unknown>>({})
  // What `compileSkillMarkdown()` would produce from the as-loaded state,
  // with zero form edits -- computed once at seed time, not the raw fetched
  // text. js-yaml's dump normalizes formatting on the way through (see
  // skill-md.ts's documented limitation), so comparing against the literal
  // bytes read from the server would treat a purely-cosmetic
  // re-serialization as "changed" on every single save. Comparing against
  // this baseline instead only re-uploads when the *content* actually
  // changed, matching the edit-tool capabilities editor's skip-when-
  // unchanged behaviour.
  const [originalSerialized, setOriginalSerialized] = useState<string | null>(null)

  // UI state
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")
  const [copiedPreview, setCopiedPreview] = useState(false)
  // Guard so a background refetch (e.g. window focus) never clobbers an
  // in-progress edit — only reseed the form when we land on a new artifact.
  const seededArtifactIdRef = useRef<string | null>(null)
  // Same guard, scoped to the content fetch: only seed the frontmatter/body
  // fields once per artifact, the first time the stored file loads.
  const seededContentIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (artifact && seededArtifactIdRef.current !== artifact.id) {
      seededArtifactIdRef.current = artifact.id

      setTitle(artifact.title)

      setVisibility(artifact.visibility)
    }
  }, [artifact])

  useEffect(() => {
    if (skillContent.data !== undefined && seededContentIdRef.current !== id) {
      seededContentIdRef.current = id
      // `data` is `null` for "no content row yet" (404) -- treat that as an
      // empty file to parse, same as a genuinely empty stored one.
      const { frontmatter, body } = parseSkillMd(skillContent.data ?? "")
      setBaseFrontmatter(frontmatter)
      setDescription(typeof frontmatter.description === "string" ? frontmatter.description : "")
      setValueProp(typeof frontmatter.value_prop === "string" ? frontmatter.value_prop : "")
      setUseCasesText(asStringArray(frontmatter.use_cases).join("\n"))
      setValueTagsText(asStringArray(frontmatter.value_tags).join(", "))
      const activation =
        frontmatter.activation && typeof frontmatter.activation === "object" && !Array.isArray(frontmatter.activation)
          ? (frontmatter.activation as Record<string, unknown>)
          : {}
      setActivationKeywordsText(asStringArray(activation.keywords).join(", "))
      setActivationTagsText(asStringArray(activation.tags).join(", "))
      setMarkdownContent(body)
      setOriginalSerialized(serializeSkillMd(frontmatter, body))
    }
  }, [skillContent.data, id])

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

  // Anything read must survive a save (design.md D5): only the fields this
  // form exposes are overwritten, everything else in baseFrontmatter passes
  // through untouched. Each exposed field is written only when it has a
  // value or the key already existed in the stored file -- a file that
  // never had `use_cases`/`value_tags`/`activation`/`value_prop` should not
  // gain empty scaffolding (`use_cases: []`, `activation: {keywords: [],
  // tags: []}`, ...) on every save; that's noise every consumer reading
  // those keys would then see.
  const buildFrontmatter = () => {
    const existingActivation =
      baseFrontmatter.activation &&
      typeof baseFrontmatter.activation === "object" &&
      !Array.isArray(baseFrontmatter.activation)
        ? (baseFrontmatter.activation as Record<string, unknown>)
        : undefined

    const next: Record<string, unknown> = {
      ...baseFrontmatter,
      name: artifact.name,
      version: artifact.version,
      description,
    }

    if (valueProp || "value_prop" in baseFrontmatter) {
      next.value_prop = valueProp
    } else {
      delete next.value_prop
    }

    const useCasesList = splitList(useCasesText, /\n/)
    if (useCasesList.length > 0 || "use_cases" in baseFrontmatter) {
      next.use_cases = useCasesList
    } else {
      delete next.use_cases
    }

    const valueTagsList = splitList(valueTagsText, /,/)
    if (valueTagsList.length > 0 || "value_tags" in baseFrontmatter) {
      next.value_tags = valueTagsList
    } else {
      delete next.value_tags
    }

    const keywordsList = splitList(activationKeywordsText, /,/)
    const tagsList = splitList(activationTagsText, /,/)
    const nextActivation: Record<string, unknown> = { ...existingActivation }
    if (keywordsList.length > 0 || existingActivation?.keywords !== undefined) {
      nextActivation.keywords = keywordsList
    }
    if (tagsList.length > 0 || existingActivation?.tags !== undefined) {
      nextActivation.tags = tagsList
    }
    if (Object.keys(nextActivation).length > 0 || existingActivation !== undefined) {
      next.activation = nextActivation
    } else {
      delete next.activation
    }

    return next
  }

  // "View Skill File" must render exactly the bytes a save would upload
  // (design.md D5) -- this is that single source of truth for both.
  const compileSkillMarkdown = () => serializeSkillMd(buildFrontmatter(), markdownContent)

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

  // A save that can't preserve content is worse than no save: block while
  // we have never obtained a value for this artifact's skill_md (still
  // loading, or the initial load failed). Gate on "do we have content",
  // not "did the most recent fetch succeed" -- react-query keeps `data`
  // around after a later background refetch fails (e.g. the user tabbed
  // away and back after the 15s staleTime, one request blipped), and
  // blocking save at that point would strand in-progress edits behind a
  // red banner for no reason: we already have safe content to save on top
  // of. A 404 resolves to `data: null` (see useArtifactTextContent), not
  // an error, so a never-created file is editable and savable too.
  //
  // A fetch succeeding is not enough on its own, though: when the stored
  // file's frontmatter fence fails to parse as YAML, the whole original
  // file (fence included) becomes the seeded body text (see the seed
  // effect above and skill-md.ts), so `compileSkillMarkdown()` would wrap
  // it in a *second*, synthetic fence built from blank/default field
  // values -- the saved bytes still contain the original body and its old
  // frontmatter verbatim (nothing is deleted), but the *parsed* frontmatter
  // a consumer would read degrades (a fresh `description: ''`, and
  // `custom_owner_note`-style unknown keys stop being keys at all, now
  // just inert text inside the body). Block saving until that's fixed.
  //
  // Deriving this from the *current* markdownContent (not the originally
  // fetched skillContent.data) is what makes the block liftable: the user
  // can fix the YAML directly in the body textarea (it's right there,
  // editable), and the moment it re-parses cleanly this flips back to
  // false. Deriving it from the fetched data instead would make this a
  // permanent dead end -- the fetched value never changes, so a block
  // based on it could never lift.
  const fenceParseFailed = parseSkillMd(markdownContent).fenceParseFailed === true
  const contentReady = skillContent.data !== undefined && !fenceParseFailed
  const contentFailed = skillContent.isError && skillContent.data === undefined
  // Informational, not an error: no skill_md has ever been stored for this
  // artifact (the 404-as-`null` sentinel). Saving from here creates it --
  // this is the only place a skill's content can ever be supplied, so this
  // must stay a savable state, not a dead end.
  const contentAbsent = skillContent.data === null
  // A later background refetch failed, but we still have the content we
  // loaded the first time. Do not block or re-alarm the user over this --
  // their in-progress edits sit on top of real, safe content -- just note
  // that the view may be stale.
  const contentStaleRefreshFailed = skillContent.isError && skillContent.data !== undefined

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!contentReady) return
    try {
      await updateArtifact.mutateAsync({ title, description, visibility })
      // Only re-upload when the compiled file actually differs from the
      // as-loaded baseline -- otherwise a metadata-only save (title,
      // visibility) would rewrite an unchanged skill_md, minting a
      // pointless new sha256 and, after js-yaml's normalization, silently
      // reformatting bytes the user never touched.
      const fileText = compileSkillMarkdown()
      if (fileText !== originalSerialized) {
        await uploadContent.mutateAsync({
          kind: "skill_md",
          file: new Blob([fileText], { type: "text/markdown" }),
        })
      }
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
  const saveDisabled = isSaving || !contentReady

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

      {contentFailed && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs font-semibold text-destructive">
          <IconAlertTriangle className="size-4 shrink-0" />
          <span>
            Could not load the stored SKILL.md
            {skillContent.error instanceof Error ? `: ${skillContent.error.message}` : "."} Saving is
            disabled so an empty editor can&apos;t overwrite the stored file.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => skillContent.refetch()}
            className="ml-auto h-7 shrink-0 rounded-full text-xs px-2.5"
          >
            Retry
          </Button>
        </div>
      )}

      {!contentFailed && fenceParseFailed && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs font-semibold text-destructive">
          <IconAlertTriangle className="size-4 shrink-0" />
          <span>
            The stored SKILL.md&apos;s frontmatter couldn&apos;t be parsed as valid YAML -- it&apos;s
            shown as-is at the top of the body below. Saving is disabled until it&apos;s fixed: the
            fields above would save as blank (and any custom keys as plain text, not real
            frontmatter) until the YAML in the body is corrected. Edit the fence directly in the
            body text to fix it -- nothing will be deleted, saving just stays off until it parses.
          </span>
        </div>
      )}

      {contentAbsent && (
        <div className="rounded-xl border border-[var(--ironhub-line)] bg-card/60 p-3 text-xs font-semibold text-muted-foreground">
          No SKILL.md is stored for this skill yet. Fill in the form below and save to create it.
        </div>
      )}

      {contentStaleRefreshFailed && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--ironhub-line)] bg-card/60 p-3 text-xs font-semibold text-muted-foreground">
          <IconAlertTriangle className="size-4 shrink-0" />
          <span>
            Couldn&apos;t refresh the stored SKILL.md. You&apos;re still editing the last version that
            loaded successfully, and saving is unaffected.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => skillContent.refetch()}
            className="ml-auto h-7 shrink-0 rounded-full text-xs px-2.5"
          >
            Retry
          </Button>
        </div>
      )}

      {skillContent.isLoading && (
        <div className="rounded-xl border border-[var(--ironhub-line)] bg-card/60 p-3 text-xs font-semibold text-muted-foreground">
          Loading stored skill content…
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Description
                  </label>
                  <Input
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What this skill does..."
                    className="bg-background/50 text-sm rounded-full"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Value Proposition
                  </label>
                  <Input
                    required
                    value={valueProp}
                    onChange={(e) => setValueProp(e.target.value)}
                    placeholder="Core value or pitch of this skill..."
                    className="bg-background/50 text-sm rounded-full"
                  />
                </div>
              </div>

              {/* Use cases + tags -- frontmatter fields this editor exposes
                  (design.md D5) beyond description/value_prop. */}
              <div className="flex flex-col gap-1.5 border-t border-[var(--ironhub-line)]/50 pt-4 mt-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Key Use Cases (one per line)
                </label>
                <textarea
                  value={useCasesText}
                  onChange={(e) => setUseCasesText(e.target.value)}
                  placeholder={"Automate client onboarding reports\nSummarize weekly usage"}
                  className="flex min-h-[80px] w-full rounded-2xl border border-[var(--ironhub-line)] bg-background/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
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
            <Button type="submit" disabled={saveDisabled} className="rounded-full px-6 shadow-sm">
              {isSaving && <IconLoader2 className="size-4 animate-spin" />}
              Save & Publish
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
