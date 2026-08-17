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
import { useToast } from "@/features/partner/store/toast-provider"
import { VisibilitySelector } from "@/features/partner/components/visibility-selector"
import { CategoryAndRepoFields } from "@/features/partner/components/category-repo-fields"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  IconArrowLeft,
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
  const updateArtifact = useUpdateArtifact(id)
  const uploadContent = useUploadArtifactContent(id)

  // Form states
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [visibility, setVisibility] = useState<"public" | "private">("private")
  const [category, setCategory] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [wasmFile, setWasmFile] = useState<File | null>(null)
  const [capabilitiesFile, setCapabilitiesFile] = useState<File | null>(null)
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
    }
  }, [artifact])

  // Separate from the metadata-seeding effect above — that effect is owned
  // by wt-content-read's content-loading rewrite, so this lane's category/repo
  // seeding gets its own artifact-id guard rather than sitting inside code
  // another lane is actively restructuring.
  const seededFieldsArtifactIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (artifact && seededFieldsArtifactIdRef.current !== artifact.id) {
      seededFieldsArtifactIdRef.current = artifact.id
      setCategory(artifact.category ?? "")
      setSourceUrl(artifact.sourceUrl ?? "")
    }
  }, [artifact])

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading tool...</div>
  }

  if (isError || !artifact || artifact.type !== "tool") {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-bold text-foreground">Tool not found</h3>
        <Button asChild variant="link" className="mt-2">
          <Link href="/mvp/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
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

  const handleCapabilitiesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".json")) {
      notify("Capabilities must be a .json file", "error")
      return
    }
    setCapabilitiesFile(file)
    notify(`Selected capabilities file: ${file.name}`, "info")
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
      if (capabilitiesFile) {
        await uploadContent.mutateAsync({ kind: "capabilities", file: capabilitiesFile })
      }
      notify(`Changes saved for ${title}`)
      router.push(`/mvp/manage/${id}`)
    } catch (error) {
      const described = describeArtifactSaveError(error)
      if (described.field === "category") setCategoryError(described.message)
      else if (described.field === "sourceUrl") setSourceUrlError(described.message)
      else setFormError(described.message)
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
          <span className="text-xs font-bold tracking-widest text-primary uppercase">
            Internal Catalog
          </span>
          <h1 className="mt-0.5 font-heading text-2xl font-bold leading-tight text-foreground">
            Edit {artifact.title}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            Update the title, description, package archive, and visibility settings for this tool.
          </p>
        </div>
      </Card>

      {formError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs font-semibold text-destructive">
          {formError}
        </div>
      )}

      <form onSubmit={handleSave} className="w-full flex flex-col gap-5">
        <Card className="border border-[var(--ironhub-line)] bg-card/60 p-6 shadow-sm flex flex-col gap-5">
          <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            1. Tool Metadata
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">
                Tool Name
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
                disabled
                value={artifact.version}
                className="bg-muted/30 text-sm rounded-full"
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

          <CategoryAndRepoFields
            category={category}
            onCategoryChange={setCategory}
            categoryError={categoryError}
            sourceUrl={sourceUrl}
            onSourceUrlChange={setSourceUrl}
            sourceUrlError={sourceUrlError}
          />

          {/* WASM Dropzone */}
          <div className="flex flex-col gap-2 border-t border-[var(--ironhub-line)]/50 pt-4 mt-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">
              Replace Tool Package (.wasm)
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
                accept=".wasm"
                onChange={handleFileChange}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <IconUpload className="size-6 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground mt-2 block">
                Drag a new WASM file here, or click to browse
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                Leave empty to keep the current package. Up to 5MB.
              </span>
            </div>

            {wasmFile && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-foreground font-semibold mt-1">
                <span className="flex items-center gap-1.5">
                  <IconFileZip className="size-4 text-emerald-600" />
                  {wasmFile.name}
                </span>
                <span className="text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase font-bold">
                  Ready
                </span>
              </div>
            )}
          </div>

          {/* Capabilities re-upload */}
          <div className="flex flex-col gap-2 border-t border-[var(--ironhub-line)]/50 pt-4 mt-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">
              Replace Capabilities (capabilities.json)
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleCapabilitiesFileChange}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-primary hover:file:bg-primary/20"
            />
            <span className="text-xs text-muted-foreground">
              Leave empty to keep the current capabilities file.
            </span>
            {capabilitiesFile && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-foreground font-semibold mt-1">
                <span className="flex items-center gap-1.5">
                  <IconFileZip className="size-4 text-emerald-600" />
                  {capabilitiesFile.name}
                </span>
                <span className="text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase font-bold">
                  Ready
                </span>
              </div>
            )}
          </div>

          <VisibilitySelector visibility={visibility} onChange={setVisibility} />
        </Card>

        <div className="rounded-xl border border-[var(--ironhub-line)] bg-card/60 p-4 shadow-sm flex flex-row items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild className="rounded-full">
            <Link href={`/mvp/manage/${id}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSaving} className="rounded-full px-6 shadow-sm">
            {isSaving && <IconLoader2 className="size-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
