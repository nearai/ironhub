"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  describeArtifactSaveError,
  useArtifact,
  useUpdateArtifact,
  useUploadArtifactContent,
} from "@/features/partner/api/artifacts"
import { useArtifactTextContent } from "@/features/partner/api/artifact-content"
import { useToast } from "@/features/partner/store/toast-provider"
import { VisibilitySelector } from "@/features/partner/components/visibility-selector"
import { CategoryAndRepoFields } from "@/features/partner/components/category-repo-fields"
import {
  parseSkillMd,
  serializeSkillMd,
} from "@/lib/private-artifacts/skill-md"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  FormSection,
  EmptyState,
  ViewToggle,
} from "@/features/partner/components/ui"
import {
  IconAlertTriangle,
  IconInfoCircle,
  IconCheck,
  IconCopy,
  IconEdit,
  IconCode,
  IconLoader2,
} from "@tabler/icons-react"

export interface SkillEditorProps {
  id: string
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
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

/**
 * The skill's editable details, rendered inside the item's page rather than
 * on a route of its own: editing and managing one item is a single job, and
 * splitting it across two pages meant a round trip for every change.
 */
export function SkillEditor({ id }: SkillEditorProps) {
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
  const [category, setCategory] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [sourceUrlError, setSourceUrlError] = useState<string | null>(null)

  // Full frontmatter map as parsed from the stored file (design.md D5). The
  // form only exposes name/version/description/value_prop/use_cases/
  // value_tags/activation.keywords/activation.tags -- every other key here
  // is passed through untouched by serializeSkillMd on save. State (not a
  // ref) because it's read during render to build the "View Skill File"
  // preview.
  const [baseFrontmatter, setBaseFrontmatter] = useState<
    Record<string, unknown>
  >({})
  // What `compileSkillMarkdown()` would produce from the as-loaded state,
  // with zero form edits -- computed once at seed time, not the raw fetched
  // text. js-yaml's dump normalizes formatting on the way through (see
  // skill-md.ts's documented limitation), so comparing against the literal
  // bytes read from the server would treat a purely-cosmetic
  // re-serialization as "changed" on every single save. Comparing against
  // this baseline instead only re-uploads when the *content* actually
  // changed, matching the edit-tool capabilities editor's skip-when-
  // unchanged behaviour.
  const [originalSerialized, setOriginalSerialized] = useState<string | null>(
    null
  )

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

  // Waits for the artifact too, not just the file: `description` falls back
  // to the record when the stored file carries none, and seeding before the
  // record arrives would fall back to nothing and never re-run.
  useEffect(() => {
    if (
      artifact &&
      skillContent.data !== undefined &&
      seededContentIdRef.current !== id
    ) {
      seededContentIdRef.current = id
      // `data` is `null` for "no content row yet" (404) -- treat that as an
      // empty file to parse, same as a genuinely empty stored one.
      const { frontmatter, body } = parseSkillMd(skillContent.data ?? "")
      setBaseFrontmatter(frontmatter)
      // The stored file's frontmatter wins when it has one; otherwise fall
      // back to the artifact record, which is what the catalog shows. Without
      // the fallback an item whose description only lives on the record opens
      // with a blank field and the save writes that blank straight back over
      // the catalog copy.
      setDescription(
        typeof frontmatter.description === "string" && frontmatter.description
          ? frontmatter.description
          : (artifact.description ?? "")
      )
      setValueProp(
        typeof frontmatter.value_prop === "string" ? frontmatter.value_prop : ""
      )
      setUseCasesText(asStringArray(frontmatter.use_cases).join("\n"))
      setValueTagsText(asStringArray(frontmatter.value_tags).join(", "))
      const activation =
        frontmatter.activation &&
          typeof frontmatter.activation === "object" &&
          !Array.isArray(frontmatter.activation)
          ? (frontmatter.activation as Record<string, unknown>)
          : {}
      setActivationKeywordsText(asStringArray(activation.keywords).join(", "))
      setActivationTagsText(asStringArray(activation.tags).join(", "))
      setMarkdownContent(body)
      setOriginalSerialized(serializeSkillMd(frontmatter, body))
    }
  }, [artifact, skillContent.data, id])

  // Category/repo seed off the artifact record, not the stored file, so they
  // get their own guard rather than waiting on the content fetch above.
  const seededFieldsArtifactIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (artifact && seededFieldsArtifactIdRef.current !== artifact.id) {
      seededFieldsArtifactIdRef.current = artifact.id
      setCategory(artifact.category ?? "")
      setSourceUrl(artifact.sourceUrl ?? "")
    }
  }, [artifact])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--ironhub-line)] bg-card px-6 py-16 text-center text-sm text-muted-foreground shadow-[var(--ironhub-shadow)]">
        <div className="flex items-center justify-center gap-2">
          <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
          <span>Loading this skill...</span>
        </div>
        <p>Fetching the details and the stored instructions.</p>
      </div>
    )
  }

  if (isError || !artifact || artifact.type !== "skill") {
    return (
      <EmptyState
        icon={IconAlertTriangle}
        title="Skill not found"
        description="This item does not exist, or it is not a skill."
        action={
          <Button asChild variant="default" className="h-11 rounded-lg sm:h-10">
            <Link href="/dashboard/catalog">Back to your catalog</Link>
          </Button>
        }
      />
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
    if (
      Object.keys(nextActivation).length > 0 ||
      existingActivation !== undefined
    ) {
      next.activation = nextActivation
    } else {
      delete next.activation
    }

    return next
  }

  // "View Skill File" must render exactly the bytes a save would upload
  // (design.md D5) -- this is that single source of truth for both.
  const compileSkillMarkdown = () =>
    serializeSkillMd(buildFrontmatter(), markdownContent)

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(compileSkillMarkdown())
      setCopiedPreview(true)
      setTimeout(() => setCopiedPreview(false), 2000)
      notify("Copied", "info")
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
  // Deriving this *only* from the current markdownContent would make the
  // block liftable but also fireable on a file that loaded perfectly
  // fine: the user can type their own `---`-delimited example into the
  // body (documenting frontmatter usage is an ordinary thing to write in
  // a skill's instructions), and that alone would grey out Save with a
  // banner that falsely claims the *stored* frontmatter is unparseable.
  // Deriving it *only* from the originally fetched skillContent.data would
  // make the block permanent (see NB2 above) -- the fetched value never
  // changes, so a block based solely on it could never lift.
  //
  // Require both: the fence must have been broken at load (so a healthy
  // file can never trigger this, no matter what the user types afterward)
  // *and* still broken in the current body (so fixing it in place lifts
  // the block).
  const loadedFenceFailed =
    skillContent.data !== undefined &&
    parseSkillMd(skillContent.data ?? "").fenceParseFailed === true
  const fenceParseFailed =
    loadedFenceFailed && parseSkillMd(markdownContent).fenceParseFailed === true
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
  const contentStaleRefreshFailed =
    skillContent.isError && skillContent.data !== undefined

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setCategoryError(null)
    setSourceUrlError(null)
    if (!contentReady) return
    try {
      // `description` (not `valueProp`) is the artifact record's description:
      // both are seeded from the stored file's frontmatter, and sending
      // value_prop here would overwrite the record with the wrong field.
      await updateArtifact.mutateAsync({
        title,
        description,
        visibility,
        category: category || null,
        sourceUrl: sourceUrl.trim() || null,
      })
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
    } catch (error) {
      const described = describeArtifactSaveError(error)
      if (described.field === "category") setCategoryError(described.message)
      else if (described.field === "sourceUrl")
        setSourceUrlError(described.message)
      else setFormError(described.message)
    }
  }

  const isSaving = updateArtifact.isPending || uploadContent.isPending
  const saveDisabled = isSaving || !contentReady

  return (
    <div className="flex flex-col gap-6">
      {formError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <IconAlertTriangle className="mt-0.5 size-5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {contentFailed && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive sm:flex-row sm:items-center">
          <div className="flex items-start gap-2.5">
            <IconAlertTriangle className="mt-0.5 size-5 shrink-0" />
            <span>
              This skill&apos;s stored instructions could not be loaded
              {skillContent.error instanceof Error
                ? `: ${skillContent.error.message}. `
                : ". "}
              Saving is turned off so an empty editor cannot overwrite what is
              stored.
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => skillContent.refetch()}
            className="h-10 shrink-0 self-start rounded-lg px-3 text-sm sm:self-center"
          >
            Retry
          </Button>
        </div>
      )}

      {!contentFailed && fenceParseFailed && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <IconAlertTriangle className="mt-0.5 size-5 shrink-0" />
          <span>
            The settings block at the top of the stored file is not valid YAML,
            so it is shown as-is at the start of the instructions below. Saving
            is turned off until it is fixed: the fields above would save as
            blank. Fix the YAML in the text below, or delete that block entirely
            and re-enter its values in the fields above.
          </span>
        </div>
      )}

      {contentAbsent && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--ironhub-line)] bg-muted/40 p-4 text-sm text-muted-foreground">
          <IconInfoCircle className="mt-0.5 size-5 shrink-0" />
          <span>
            This skill has no instructions yet. Fill in the sections below and
            save to create them.
          </span>
        </div>
      )}

      {contentStaleRefreshFailed && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--ironhub-line)] bg-muted/40 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <div className="flex items-start gap-2.5">
            <IconInfoCircle className="mt-0.5 size-5 shrink-0" />
            <span>
              Could not refresh the stored instructions. You are still editing
              the last version that loaded, and saving still works.
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => skillContent.refetch()}
            className="h-10 shrink-0 self-start rounded-lg px-3 text-sm sm:self-center"
          >
            Retry
          </Button>
        </div>
      )}

      {skillContent.isLoading && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--ironhub-line)] bg-muted/40 p-4 text-sm text-muted-foreground">
          <IconLoader2 className="mt-0.5 size-5 shrink-0 animate-spin" />
          <span>Loading this skill&apos;s stored instructions...</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <FormSection
          step={1}
          title="Basics"
          description="The name, version and one-line summary people see."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="skill-name"
                className="text-sm font-medium text-foreground"
              >
                Name
              </label>
              <Input
                id="skill-name"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 rounded-lg sm:h-10"
              />
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
                disabled
                aria-readonly="true"
                value={artifact.version}
                className="h-11 rounded-lg border-[var(--ironhub-line)] bg-muted text-muted-foreground disabled:opacity-100 sm:h-10"
              />
              <p className="text-sm text-muted-foreground">
                Set when you publish an update. It cannot be changed here.
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
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this skill does..."
              className="h-11 rounded-lg sm:h-10"
            />
            <p className="text-sm text-muted-foreground">
              One line explaining what this does. This is what people see in the
              catalog.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="skill-value-prop"
              className="text-sm font-medium text-foreground"
            >
              Why someone would use it
            </label>
            <Input
              id="skill-value-prop"
              required
              value={valueProp}
              onChange={(e) => setValueProp(e.target.value)}
              placeholder="Core value or pitch of this skill..."
              className="h-11 rounded-lg sm:h-10"
            />
            <p className="text-sm text-muted-foreground">
              The main benefit, in one line.
            </p>
          </div>
        </FormSection>

        <FormSection
          step={2}
          title="Finding and triggering it"
          description="Helps the right skill turn up at the right moment."
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="skill-use-cases"
              className="text-sm font-medium text-foreground"
            >
              What it&apos;s for
            </label>
            <textarea
              id="skill-use-cases"
              value={useCasesText}
              onChange={(e) => setUseCasesText(e.target.value)}
              placeholder={
                "Automate client onboarding reports\nSummarize weekly usage"
              }
              className="min-h-[80px] w-full rounded-lg border border-[var(--ironhub-line)] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
            <p className="text-sm text-muted-foreground">
              One example per line of something a person would use this for.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="skill-topics"
                className="text-sm font-medium text-foreground"
              >
                Topics
              </label>
              <Input
                id="skill-topics"
                value={valueTagsText}
                onChange={(e) => setValueTagsText(e.target.value)}
                placeholder="Automation, Security"
                className="h-11 rounded-lg sm:h-10"
              />
              <p className="text-sm text-muted-foreground">
                What this skill is about. Used for browsing and search. Separate
                with commas.
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
                value={activationKeywordsText}
                onChange={(e) => setActivationKeywordsText(e.target.value)}
                placeholder="auth, login"
                className="h-11 rounded-lg sm:h-10"
              />
              <p className="text-sm text-muted-foreground">
                Words in a request that should bring this skill in. Separate
                with commas.
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
                value={activationTagsText}
                onChange={(e) => setActivationTagsText(e.target.value)}
                placeholder="productivity"
                className="h-11 rounded-lg sm:h-10"
              />
              <p className="text-sm text-muted-foreground">
                Broader subjects that should bring this skill in. Separate with
                commas.
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--ironhub-line)] pt-4">
            <CategoryAndRepoFields
              category={category}
              onCategoryChange={setCategory}
              categoryError={categoryError}
              sourceUrl={sourceUrl}
              onSourceUrlChange={setSourceUrl}
              sourceUrlError={sourceUrlError}
            />
          </div>
        </FormSection>

        <FormSection
          step={3}
          title="Instructions (SKILL.md)"
          description="What the assistant should do when this skill runs. This is the whole of the stored file."
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
          <div className={activeTab === "edit" ? "block" : "hidden"}>
            <textarea
              placeholder={"## Persona\n\nDescribe how the agent should act..."}
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              className="min-h-[360px] w-full rounded-lg border border-[var(--ironhub-line)] bg-background px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
          </div>

          <div className={activeTab === "preview" ? "block" : "hidden"}>
            <div className="mb-3 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyCode}
                className="flex h-10 items-center gap-1.5 rounded-lg px-3.5 text-sm sm:h-9"
              >
                {copiedPreview ? (
                  <>
                    <IconCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <IconCopy className="size-4" />
                    <span>Copy file</span>
                  </>
                )}
              </Button>
            </div>

            <div className="max-h-[36rem] w-full overflow-auto rounded-xl border border-[var(--ironhub-line)] bg-muted/40 p-4 font-mono text-sm leading-relaxed whitespace-pre text-foreground select-text selection:bg-primary/30">
              {compileSkillMarkdown()}
            </div>
          </div>
        </FormSection>

        <FormSection
          step={4}
          title="Who can see it"
          description="Private stays inside this workspace."
        >
          <VisibilitySelector
            visibility={visibility}
            onChange={setVisibility}
          />
        </FormSection>

        <div className="flex justify-end border-t border-[var(--ironhub-line)] pt-6">
          <Button
            type="submit"
            disabled={saveDisabled}
            className="h-11 w-full rounded-lg px-6 sm:h-10 sm:w-auto"
          >
            {isSaving && <IconLoader2 className="mr-1.5 size-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </form>
    </div>
  )
}
