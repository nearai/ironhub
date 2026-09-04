"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  describeArtifactSaveError,
  useArtifact,
  useArtifactBundleEntries,
  useUpdateArtifact,
  useUploadArtifactBundle,
} from "@/features/partner/api/artifacts"
import { ApiError } from "@/features/partner/api/client"
import { useToast } from "@/features/partner/store/toast-provider"
import { VisibilitySelector } from "@/features/partner/components/visibility-selector"
import { CategoryAndRepoFields } from "@/features/partner/components/category-repo-fields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  FormSection,
  EmptyState,
  FileTree,
  RelativeTime,
} from "@/features/partner/components/ui"
import { formatBytes } from "@/lib/shared/format-utils"
import { cn } from "@/lib/shared/utils"
import {
  IconAlertTriangle,
  IconLock,
  IconUpload,
  IconFileZip,
  IconLoader2,
} from "@tabler/icons-react"

export interface ToolEditorProps {
  id: string
}

/**
 * The tool's editable details, rendered inside the item's page rather than on
 * a route of its own: editing and managing one item is a single job, and
 * splitting it across two pages meant a round trip for every change.
 */
export function ToolEditor({ id }: ToolEditorProps) {
  const { notify } = useToast()
  const { data: artifact, isLoading, isError } = useArtifact(id)
  const updateArtifact = useUpdateArtifact(id)
  const uploadBundle = useUploadArtifactBundle()

  // Form states
  const [title, setTitle] = useState("")
  const [version, setVersion] = useState("")
  const [description, setDescription] = useState("")
  const [visibility, setVisibility] = useState<"public" | "private">("private")
  const [category, setCategory] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [sourceUrlError, setSourceUrlError] = useState<string | null>(null)
  const [versionError, setVersionError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // Guard so a background refetch (e.g. window focus) never clobbers an
  // in-progress edit — only reseed the form when we land on a new artifact.
  const seededArtifactIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (artifact && seededArtifactIdRef.current !== artifact.id) {
      seededArtifactIdRef.current = artifact.id
      setTitle(artifact.title)
      setVersion(artifact.version)
      setDescription(artifact.description || "")
      setVisibility(artifact.visibility)
      setCategory(artifact.category ?? "")
      setSourceUrl(artifact.sourceUrl ?? "")
    }
  }, [artifact])

  const storedPackage = artifact?.content.find((c) => c.kind === "bundle_zip")
  // Only asked for when a package is actually stored: the listing is read out
  // of that archive, so without one the request could only 404.
  const bundleEntries = useArtifactBundleEntries(id, {
    enabled: Boolean(storedPackage),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--ironhub-line)] bg-card px-6 py-16 text-center text-sm text-muted-foreground shadow-[var(--ironhub-shadow)]">
        <div className="flex items-center justify-center gap-2">
          <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
          <span>Loading this tool...</span>
        </div>
        <p>Fetching the details and the stored files.</p>
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
            <Link href="/dashboard/catalog">Back to catalog</Link>
          </Button>
        }
      />
    )
  }

  // While a published version's package is frozen, saying so up front is the
  // difference between an author reading the refusal as a rule and reading it
  // as a bug. The server enforces it either way -- this only moves the news to
  // before the upload instead of after it.
  const isFrozen =
    artifact.status === "published" &&
    artifact.publishedVersion === artifact.version

  // The whole package is the unit of change: a tool is created from one .zip
  // and every file the hub stores for it is extracted from that archive, so
  // replacing a single file inside it (the .wasm used to have its own upload
  // here) could only leave manifest.toml describing bytes that were no longer
  // there. Uploading runs immediately rather than waiting for Save changes --
  // it rewrites the stored content rows and the whole declared asset set in
  // one server-side transaction, which is not something to fold into a form
  // submit that could half-apply.
  const handleBundleUpload = async (file: File) => {
    setUploadError(null)
    if (isFrozen) {
      setUploadError(
        `This tool is published at version ${artifact.version}. Change the version above and save, then upload the new package.`
      )
      return
    }
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setUploadError("Only .zip archives are accepted.")
      return
    }
    try {
      await uploadBundle.mutateAsync({ id: artifact.id, bytes: file })
      notify("Package uploaded")
    } catch (error) {
      setUploadError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to upload the package."
      )
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }
  const handleDragLeave = () => setDragOver(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleBundleUpload(file)
  }


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setCategoryError(null)
    setSourceUrlError(null)
    setVersionError(null)

    try {
      await updateArtifact.mutateAsync({
        title,
        description,
        visibility,
        category: category || null,
        sourceUrl: sourceUrl.trim() || null,
        // Sent only when it actually changed: the server refuses a version
        // equal to the stored one, so including it unconditionally would turn
        // every metadata-only save into a rejection.
        ...(version !== artifact.version ? { version } : {}),
      })
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

  const isSaving = updateArtifact.isPending

  return (
    <div className="flex flex-col gap-6">
      {formError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <IconAlertTriangle className="mt-0.5 size-5 shrink-0" />
          <span>{formError}</span>
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
                    ? "This version is published. Change it before you can replace the package."
                    : "Give every release its own version. It can only move forward."}
                </p>
              )}
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
              placeholder="What this tool does, in one line..."
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
          title="Package"
          description="The .zip file this tool is built from. Everything stored for it comes out of this archive."
        >
          {storedPackage ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-[var(--ironhub-line)] bg-card px-4 py-3">
                <span className="flex min-w-0 items-center gap-2">
                  <IconFileZip
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm font-medium text-foreground">
                    {artifact.name}.zip
                  </span>
                </span>
                <span
                  className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
                  title={storedPackage.sha256}
                >
                  <span>{formatBytes(storedPackage.sizeBytes)}</span>
                  {storedPackage.createdAt && (
                    <>
                      <span>·</span>
                      <span>uploaded</span>
                      <RelativeTime value={storedPackage.createdAt} />
                    </>
                  )}
                </span>
              </div>

              {bundleEntries.isLoading && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
                  <span>Reading what is inside...</span>
                </p>
              )}
              {bundleEntries.isError && (
                <p className="text-sm text-muted-foreground">
                  We couldn&apos;t read what is inside this package right now.
                </p>
              )}
              {bundleEntries.data && bundleEntries.data.length > 0 && (
                <FileTree entries={bundleEntries.data} />
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-400">
              <IconAlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                No package is stored yet. Upload the .zip below — this tool
                cannot be installed until you do.
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                isFrozen
                  ? "border-[var(--ironhub-line)] bg-muted/40"
                  : dragOver
                    ? "border-primary bg-primary/5"
                    : "border-[var(--ironhub-line)] bg-background/50 hover:border-primary/50"
              )}
            >
              <input
                id="bundle-upload-input"
                type="file"
                accept=".zip"
                disabled={uploadBundle.isPending || isFrozen}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ""
                  if (file) void handleBundleUpload(file)
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              {isFrozen ? (
                <IconLock
                  className="size-6 text-muted-foreground"
                  aria-hidden="true"
                />
              ) : (
                <IconUpload
                  className="size-6 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <span className="mt-2 block text-sm font-medium text-foreground">
                {isFrozen
                  ? `Version ${artifact.version} is published`
                  : storedPackage
                    ? "Drop a new .zip here to update this tool"
                    : "Drop the .zip here, or choose one"}
              </span>
              <span className="mt-1 text-sm text-muted-foreground">
                {isFrozen
                  ? "Change the version above and save first, so anyone already running this version keeps the package they were given."
                  : "Updating replaces the whole package straight away. It does not wait for Save changes."}
              </span>
            </div>

            {uploadBundle.isPending && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <IconLoader2 className="size-4 animate-spin" aria-hidden="true" />
                <span>Uploading...</span>
              </span>
            )}
            {uploadError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm font-medium text-destructive">
                {uploadError}
              </div>
            )}
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
            disabled={isSaving}
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
