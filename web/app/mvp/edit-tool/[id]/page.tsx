"use client"

import React, { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  WorkspacePageHeader,
  FormSection,
  EmptyState,
  AttributeBadge,
} from "@/features/partner/components/ui"
import {
  IconAlertTriangle,
  IconInfoCircle,
  IconUpload,
  IconFileZip,
  IconLoader2,
} from "@tabler/icons-react"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditToolPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { notify } = useToast()
  const { data: artifact, isLoading, isError } = useArtifact(id)
  const {
    data: capabilitiesText,
    isLoading: isCapabilitiesLoading,
    isError: isCapabilitiesError,
    error: capabilitiesError,
    refetch: refetchCapabilities,
  } = useArtifactTextContent(id, "capabilities")
  const updateArtifact = useUpdateArtifact(id)
  const uploadContent = useUploadArtifactContent(id)

  // Form states
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [visibility, setVisibility] = useState<"public" | "private">("private")
  const [category, setCategory] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [wasmFile, setWasmFile] = useState<File | null>(null)
  const [capabilitiesDraft, setCapabilitiesDraft] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [sourceUrlError, setSourceUrlError] = useState<string | null>(null)
  // Guard so a background refetch (e.g. window focus) never clobbers an
  // in-progress edit — only reseed the form when we land on a new artifact.
  const seededArtifactIdRef = useRef<string | null>(null)
  // Same guard, scoped to the capabilities content fetch: only seed the
  // editor once per artifact, the first time the stored file loads.
  const seededCapabilitiesIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (artifact && seededArtifactIdRef.current !== artifact.id) {
      seededArtifactIdRef.current = artifact.id

      setTitle(artifact.title)

      setDescription(artifact.description || "")

      setVisibility(artifact.visibility)
    }
  }, [artifact])

  useEffect(() => {
    if (
      capabilitiesText !== undefined &&
      seededCapabilitiesIdRef.current !== id
    ) {
      seededCapabilitiesIdRef.current = id
      // `capabilitiesText` is `null` for "no content row yet" (404) -- seed
      // an empty draft in that case, same as a genuinely empty stored file.
      setCapabilitiesDraft(capabilitiesText ?? "")
    }
  }, [capabilitiesText, id])

  // Category/repo seed off the artifact record, not the stored capabilities
  // document, so they get their own guard rather than waiting on that fetch.
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
          <span>Loading this tool...</span>
        </div>
        <p>Fetching the details and the stored permissions.</p>
      </div>
    )
  }

  if (isError || !artifact || artifact.type !== "tool") {
    return (
      <EmptyState
        icon={IconAlertTriangle}
        title="Tool not found"
        description="This item does not exist, or it is not a tool."
        action={
          <Button asChild variant="default" className="h-11 rounded-lg sm:h-10">
            <Link href="/mvp/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    )
  }

  // A save that cannot preserve the stored capabilities document is worse
  // than no save (same invariant as the skill editor, design.md D5): block
  // saving until we have obtained a value for this artifact's capabilities
  // at least once. Gate on "do we have content" (`data !== undefined`),
  // not on the latest fetch's success -- a later background refetch
  // failing must not strand in-progress edits behind a blocked save when
  // we already have safe content loaded. A 404 resolves to `data: null`
  // (see useArtifactTextContent), a legitimate "nothing stored yet" state,
  // not an error -- that keeps a tool whose capabilities upload never
  // completed during creation editable instead of permanently stuck.
  const capabilitiesReady = capabilitiesText !== undefined
  const capabilitiesFailed =
    isCapabilitiesError && capabilitiesText === undefined
  // Informational, not an error: no capabilities.json has ever been stored
  // for this artifact (the 404-as-`null` sentinel). Saving from here
  // creates it -- the manage page's bundle re-upload replaces the whole
  // package, not a single capabilities document, so this first-write path
  // is still the one that matters for a tool with no capabilities yet.
  const capabilitiesAbsent = capabilitiesText === null
  // A later background refetch failed, but we still have the content we
  // loaded the first time. Do not block or disable the editor over this --
  // in-progress edits sit on top of real, safe content -- just note the
  // view may be stale.
  const capabilitiesStaleRefreshFailed =
    isCapabilitiesError && capabilitiesText !== undefined

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }
  const handleDragLeave = () => setDragOver(false)

  const acceptFile = (file: File) => {
    if (!file.name.endsWith(".wasm")) {
      notify("Only .wasm files are accepted", "error")
      return
    }
    setWasmFile(file)
    notify(`Selected package: ${file.name}`, "info")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) acceptFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) acceptFile(file)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setCategoryError(null)
    setSourceUrlError(null)
    if (!capabilitiesReady) return

    try {
      JSON.parse(capabilitiesDraft)
    } catch {
      setFormError("Permissions must be valid JSON.")
      return
    }

    try {
      await updateArtifact.mutateAsync({
        title,
        description,
        visibility,
        category: category || null,
        sourceUrl: sourceUrl.trim() || null,
      })
      if (wasmFile) {
        await uploadContent.mutateAsync({ kind: "wasm", file: wasmFile })
      }
      // Only re-upload capabilities when the draft actually differs from
      // what was loaded -- otherwise every metadata-only save rewrites an
      // unchanged blob and mints a pointless new sha256 for it.
      if (capabilitiesDraft !== capabilitiesText) {
        await uploadContent.mutateAsync({
          kind: "capabilities",
          file: new Blob([capabilitiesDraft], { type: "application/json" }),
        })
      }
      notify(`Changes saved for ${title}`)
      router.push(`/mvp/manage/${id}`)
    } catch (error) {
      const described = describeArtifactSaveError(error)
      if (described.field === "category") setCategoryError(described.message)
      else if (described.field === "sourceUrl")
        setSourceUrlError(described.message)
      else setFormError(described.message)
    }
  }

  const isSaving = updateArtifact.isPending || uploadContent.isPending
  const saveDisabled = isSaving || !capabilitiesReady

  return (
    <div className="flex flex-col gap-6">
      <WorkspacePageHeader
        backHref={`/mvp/manage/${id}`}
        backLabel="Back to item details"
        title={`Edit ${artifact.title}`}
        description="Change this tool's details, program file and permissions."
      />

      {formError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <IconAlertTriangle className="mt-0.5 size-5 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {capabilitiesFailed && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive sm:flex-row sm:items-center">
          <div className="flex items-start gap-2.5">
            <IconAlertTriangle className="mt-0.5 size-5 shrink-0" />
            <span>
              This tool&apos;s stored permissions could not be loaded
              {capabilitiesError instanceof Error
                ? `: ${capabilitiesError.message}. `
                : ". "}
              Saving is turned off so an empty editor cannot overwrite what is
              stored.
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => refetchCapabilities()}
            className="h-10 shrink-0 self-start rounded-lg px-3 text-sm sm:self-center"
          >
            Retry
          </Button>
        </div>
      )}

      {capabilitiesAbsent && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--ironhub-line)] bg-muted/40 p-4 text-sm text-muted-foreground">
          <IconInfoCircle className="mt-0.5 size-5 shrink-0" />
          <span>
            No permissions file is stored for this tool. That is fine — add one
            only if this tool needs to reach something.
          </span>
        </div>
      )}

      {capabilitiesStaleRefreshFailed && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--ironhub-line)] bg-muted/40 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <div className="flex items-start gap-2.5">
            <IconInfoCircle className="mt-0.5 size-5 shrink-0" />
            <span>
              Could not refresh the stored permissions. You are still editing
              the last version that loaded, and saving still works.
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => refetchCapabilities()}
            className="h-10 shrink-0 self-start rounded-lg px-3 text-sm sm:self-center"
          >
            Retry
          </Button>
        </div>
      )}

      {isCapabilitiesLoading && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[var(--ironhub-line)] bg-muted/40 p-4 text-sm text-muted-foreground">
          <IconLoader2 className="mt-0.5 size-5 shrink-0 animate-spin" />
          <span>Loading this tool&apos;s stored permissions...</span>
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
                htmlFor="tool-name"
                className="text-sm font-medium text-foreground"
              >
                Name
              </label>
              <Input
                id="tool-name"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 rounded-lg sm:h-10"
              />
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
              htmlFor="tool-description"
              className="text-sm font-medium text-foreground"
            >
              Short description
            </label>
            <textarea
              id="tool-description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a description of the tool capabilities..."
              className="min-h-[100px] w-full rounded-lg border border-[var(--ironhub-line)] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
            <p className="text-sm text-muted-foreground">
              One line explaining what this does. This is what people see in the
              catalog.
            </p>
          </div>
        </FormSection>

        <FormSection
          step={2}
          title="Finding it"
          description="Category and repository links for this tool."
        >
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
          step={3}
          title="Program file"
          description="The program that runs when someone uses this tool."
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Replace the program file
            </label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-[var(--ironhub-line)] bg-background/50 hover:border-primary/50"
              }`}
            >
              <input
                type="file"
                accept=".wasm"
                onChange={handleFileChange}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <IconUpload className="size-6 text-muted-foreground" />
              <span className="mt-2 block text-sm font-medium text-foreground">
                Drop a new program file here, or choose one
              </span>
              <span className="mt-1 text-sm text-muted-foreground">
                This is the compiled .wasm program that runs the tool. Leave it
                empty to keep the one already stored. Up to 5MB.
              </span>
            </div>

            {/* Neutral, not green: a file waiting to be uploaded is a fact, and
                the emerald ramp means "published" everywhere else. */}
            {wasmFile && (
              <div className="mt-1 flex items-center justify-between rounded-lg border border-[var(--ironhub-line)] bg-muted/40 p-3 text-sm text-foreground">
                <span className="flex min-w-0 items-center gap-2">
                  <IconFileZip className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{wasmFile.name}</span>
                </span>
                <AttributeBadge className="shrink-0">
                  Ready to upload
                </AttributeBadge>
              </div>
            )}
          </div>
        </FormSection>

        <FormSection
          step={4}
          title="Permissions"
          description="What this tool is allowed to reach."
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="tool-permissions" className="sr-only">
              Permissions
            </label>
            <textarea
              id="tool-permissions"
              required
              disabled={!capabilitiesReady}
              value={capabilitiesDraft}
              onChange={(e) => setCapabilitiesDraft(e.target.value)}
              placeholder='{ "permissions": [] }'
              className="min-h-[220px] w-full rounded-lg border border-[var(--ironhub-line)] bg-background px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
            />
            <p className="text-sm text-muted-foreground">
              This declares what the package is allowed to access, and must be
              valid JSON or saving will be refused. Leave this as it is unless
              you were given something to paste in.
            </p>
          </div>
        </FormSection>

        <FormSection
          step={5}
          title="Who can see it"
          description="Private stays inside this workspace."
        >
          <VisibilitySelector
            visibility={visibility}
            onChange={setVisibility}
          />
        </FormSection>

        <div className="flex flex-col gap-4 border-t border-[var(--ironhub-line)] pt-6">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              asChild
              className="h-11 w-full rounded-lg px-6 sm:h-10 sm:w-auto"
            >
              <Link href={`/mvp/manage/${id}`}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={saveDisabled}
              className="h-11 w-full rounded-lg px-6 sm:h-10 sm:w-auto"
            >
              {isSaving && (
                <IconLoader2 className="mr-1.5 size-4 animate-spin" />
              )}
              Save changes
            </Button>
          </div>
          <p className="text-sm text-muted-foreground sm:text-right">
            Publishing is handled on the item&apos;s details page.
          </p>
        </div>
      </form>
    </div>
  )
}
