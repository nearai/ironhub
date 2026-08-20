"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  describeArtifactSaveError,
  useArtifact,
  useUpdateArtifact,
  useUploadArtifactContent,
} from "@/features/partner/api/artifacts"
import { useToast } from "@/features/partner/store/toast-provider"
import { VisibilitySelector } from "@/features/partner/components/visibility-selector"
import { CategoryAndRepoFields } from "@/features/partner/components/category-repo-fields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  FormSection,
  EmptyState,
  AttributeBadge,
} from "@/features/partner/components/ui"
import {
  IconAlertTriangle,
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
  const uploadContent = useUploadArtifactContent(id)

  // Form states
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [visibility, setVisibility] = useState<"public" | "private">("private")
  const [category, setCategory] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [wasmFile, setWasmFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [sourceUrlError, setSourceUrlError] = useState<string | null>(null)
  // Guard so a background refetch (e.g. window focus) never clobbers an
  // in-progress edit — only reseed the form when we land on a new artifact.
  const seededArtifactIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (artifact && seededArtifactIdRef.current !== artifact.id) {
      seededArtifactIdRef.current = artifact.id
      setTitle(artifact.title)
      setDescription(artifact.description || "")
      setVisibility(artifact.visibility)
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
            <Link href="/mvp/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    )
  }

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
  const saveDisabled = isSaving

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
