"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  IconAlertTriangle,
  IconInfoCircle,
  IconLoader2,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useArtifactTextContent } from "@/features/partner/api/artifact-content"
import { VisibilitySelector } from "@/features/partner/components/visibility-selector"
import {
  describeArtifactSaveError,
  useArtifact,
  useUpdateArtifact,
  useUploadArtifactContent,
} from "@/features/partner/api/artifacts"
import { CategoryAndRepoFields } from "@/features/partner/components/category-repo-fields"
import { EmptyState, FormSection } from "@/features/partner/components/ui"
import { useToast } from "@/features/partner/store/toast-provider"

export interface SoulEditorProps {
  id: string
}

/**
 * A soul's editable details, rendered inside the item's page for the same
 * reason the skill and tool editors are: managing and editing one item is a
 * single job.
 *
 * There is no frontmatter here and no field-by-field form over the document,
 * because a SOUL.md has no schema to build one from -- it is free-form
 * Markdown read as the first block of the agent's system prompt (design.md --
 * Context). The whole editor is therefore the two documents and the record
 * fields around them, and the stored bytes are exactly what is typed.
 *
 * The README is edited beside the soul and published nowhere. That is the
 * point of it having its own content kind: it is where an author explains the
 * persona to their colleagues without that explanation becoming instructions
 * an agent reads.
 */
export function SoulEditor({ id }: SoulEditorProps) {
  const { notify } = useToast()
  const { data: artifact, isLoading, isError } = useArtifact(id)
  const updateArtifact = useUpdateArtifact(id)
  const uploadContent = useUploadArtifactContent(id)
  const soulContent = useArtifactTextContent(id, "soul_md")
  const readmeContent = useArtifactTextContent(id, "readme_md")

  const [title, setTitle] = useState("")
  const [version, setVersion] = useState("")
  const [description, setDescription] = useState("")
  const [soulText, setSoulText] = useState("")
  const [readmeText, setReadmeText] = useState("")
  const [category, setCategory] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [visibility, setVisibility] = useState<"public" | "private">("private")
  const [formError, setFormError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [sourceUrlError, setSourceUrlError] = useState<string | null>(null)
  const [versionError, setVersionError] = useState<string | null>(null)
  const [soulError, setSoulError] = useState<string | null>(null)

  // What each document read as when it loaded, so a metadata-only save does
  // not re-upload identical bytes and mint a new sha256 for them -- the same
  // rule the skill editor follows, for the same reason.
  const [storedSoul, setStoredSoul] = useState<string | null>(null)
  const [storedReadme, setStoredReadme] = useState<string | null>(null)

  // Guards so a background refetch (window focus, say) never clobbers an
  // in-progress edit -- only seed when we land on a new artifact.
  const seededArtifactIdRef = useRef<string | null>(null)
  const seededSoulIdRef = useRef<string | null>(null)
  const seededReadmeIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (artifact && seededArtifactIdRef.current !== artifact.id) {
      seededArtifactIdRef.current = artifact.id
      setTitle(artifact.title)
      setVersion(artifact.version)
      setDescription(artifact.description ?? "")
      setCategory(artifact.category ?? "")
      setSourceUrl(artifact.sourceUrl ?? "")
      setVisibility(artifact.visibility)
    }
  }, [artifact])

  useEffect(() => {
    if (soulContent.data !== undefined && seededSoulIdRef.current !== id) {
      seededSoulIdRef.current = id
      // `null` is the "no content row yet" sentinel, not a failure: a soul
      // created without its document is finished from here.
      setSoulText(soulContent.data ?? "")
      setStoredSoul(soulContent.data)
    }
  }, [soulContent.data, id])

  useEffect(() => {
    if (readmeContent.data !== undefined && seededReadmeIdRef.current !== id) {
      seededReadmeIdRef.current = id
      setReadmeText(readmeContent.data ?? "")
      setStoredReadme(readmeContent.data)
    }
  }, [readmeContent.data, id])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--ironhub-line)] bg-card px-6 py-16 text-center text-sm text-muted-foreground shadow-[var(--ironhub-shadow)]">
        <div className="flex items-center justify-center gap-2">
          <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
          <span>Loading this soul...</span>
        </div>
        <p>Fetching the details and the stored documents.</p>
      </div>
    )
  }

  if (isError || !artifact || artifact.type !== "soul") {
    return (
      <EmptyState
        icon={IconAlertTriangle}
        title="Soul not found"
        description="This item does not exist, or it is not a soul."
        action={
          <Button asChild variant="default" className="h-11 rounded-lg sm:h-10">
            <Link href="/dashboard/catalog">Back to catalog</Link>
          </Button>
        }
      />
    )
  }

  const isFrozen =
    artifact.status === "published" &&
    artifact.publishedVersion === artifact.version

  // Same rule as the skill editor: block saving only while we have never
  // obtained a value for a document, since saving then would write an empty
  // editor over stored bytes. A 404 resolves to `null`, which is safe.
  const contentReady =
    soulContent.data !== undefined && readmeContent.data !== undefined
  const contentFailed =
    (soulContent.isError && soulContent.data === undefined) ||
    (readmeContent.isError && readmeContent.data === undefined)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setCategoryError(null)
    setSourceUrlError(null)
    setVersionError(null)
    setSoulError(null)
    if (!contentReady) return

    // Refused here as well as by the server because the metadata PATCH below
    // commits first: without this the author is looking at a save that
    // applied their title change and then rejected their document.
    if (soulText.trim() === "") {
      setSoulError("A soul needs a document. Write it before saving.")
      return
    }

    const soulChanged = soulText !== storedSoul
    const readmeChanged = readmeText !== storedReadme

    if (isFrozen && version === artifact.version && (soulChanged || readmeChanged)) {
      setVersionError(
        `This soul is published at version ${artifact.version}. Change the version to save a new document, so anyone already running ${artifact.version} keeps the soul they were given.`
      )
      return
    }

    try {
      await updateArtifact.mutateAsync({
        title,
        description,
        category: category || null,
        sourceUrl: sourceUrl.trim() || null,
        visibility,
        // Sent only when it moved -- the server refuses a version equal to the
        // stored one -- and sent first, because it is also what releases the
        // published-content freeze the uploads below would otherwise hit.
        ...(version !== artifact.version ? { version } : {}),
      })

      if (soulChanged) {
        await uploadContent.mutateAsync({
          kind: "soul_md",
          file: new Blob([soulText], { type: "text/markdown" }),
        })
        setStoredSoul(soulText)
      }
      if (readmeChanged) {
        await uploadContent.mutateAsync({
          kind: "readme_md",
          file: new Blob([readmeText], { type: "text/markdown" }),
        })
        setStoredReadme(readmeText)
      }

      notify(`Changes saved for ${title}`)
    } catch (error) {
      const described = describeArtifactSaveError(error)
      if (described.field === "category") setCategoryError(described.message)
      else if (described.field === "sourceUrl")
        setSourceUrlError(described.message)
      else if (described.field === "version") setVersionError(described.message)
      else setFormError(described.message)
    }
  }

  const isSaving = updateArtifact.isPending || uploadContent.isPending

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
              This soul&apos;s stored documents could not be loaded. Saving is
              turned off so an empty editor cannot overwrite what is stored.
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void soulContent.refetch()
              void readmeContent.refetch()
            }}
            className="h-10 shrink-0 self-start rounded-lg px-3 text-sm sm:self-center"
          >
            Retry
          </Button>
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
                htmlFor="soul-title"
                className="text-sm font-medium text-foreground"
              >
                Name
              </label>
              <Input
                id="soul-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 rounded-lg sm:h-10"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="soul-version"
                className="text-sm font-medium text-foreground"
              >
                Version
              </label>
              <Input
                id="soul-version"
                required
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                aria-invalid={versionError ? true : undefined}
                className="h-11 rounded-lg sm:h-10"
              />
              {versionError ? (
                <p className="text-sm font-medium text-destructive">
                  {versionError}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isFrozen
                    ? "This version is published. Change it before you can save a new document."
                    : "Give every release its own version. It can only move forward."}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="soul-description"
              className="text-sm font-medium text-foreground"
            >
              Short description
            </label>
            <Input
              id="soul-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One line describing this persona."
              className="h-11 rounded-lg sm:h-10"
            />
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

        <FormSection
          step={2}
          title="The soul (SOUL.md)"
          description="Who the agent is, how it speaks, and what it will not do. This document is the whole of the stored file, and the agent reads it before its memory and its tools."
        >
          <label htmlFor="soul-document" className="sr-only">
            The soul document
          </label>
          <textarea
            id="soul-document"
            required
            value={soulText}
            onChange={(e) => setSoulText(e.target.value)}
            aria-invalid={soulError ? true : undefined}
            placeholder={
              "# Who you are\n\nYou are...\n\n# How you speak\n\n...\n\n# What you will not do\n\n..."
            }
            className="min-h-[360px] w-full rounded-lg border border-[var(--ironhub-line)] bg-background px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
          {soulError && (
            <p className="text-sm font-medium text-destructive">{soulError}</p>
          )}
        </FormSection>

        <FormSection
          step={3}
          title="Readme (README.md)"
          description="Notes for the people browsing this workspace. Optional."
        >
          <div className="flex items-start gap-2.5 rounded-xl border border-[var(--ironhub-line)] bg-muted/40 p-4 text-sm text-muted-foreground">
            <IconInfoCircle className="mt-0.5 size-5 shrink-0" />
            <span>
              This readme stays in the hub. It is never sent to an agent, so
              nothing written here reaches the model — put anything the agent
              needs to act on in the soul above.
            </span>
          </div>
          <label htmlFor="soul-readme" className="sr-only">
            Readme
          </label>
          <textarea
            id="soul-readme"
            value={readmeText}
            onChange={(e) => setReadmeText(e.target.value)}
            placeholder={"What this persona is for, and when to reach for it."}
            className="min-h-[200px] w-full rounded-lg border border-[var(--ironhub-line)] bg-background px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        </FormSection>

        <FormSection
          step={4}
          title="Who can see it"
          description="Private stays inside this workspace."
        >
          {/* A soul is the one artifact type whose content *is* the
              instruction set: it is read as the opening of an installer's
              system prompt, ahead of their memory and tools. The choice is
              the author's, but the note stays, because what a reader takes on
              by installing a soul is not what they take on by installing a
              sandboxed tool, and nothing else on this screen says so. */}
          <VisibilitySelector
            visibility={visibility}
            onChange={setVisibility}
          />
          <p className="mt-3 text-sm leading-snug text-muted-foreground">
            A published soul is read as the opening of an installer&apos;s
            system prompt, ahead of their memory and tools. Anyone installing
            it sees the full text first.
          </p>
        </FormSection>

        <div className="flex justify-end border-t border-[var(--ironhub-line)] pt-6">
          <Button
            type="submit"
            disabled={isSaving || !contentReady}
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
