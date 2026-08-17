"use client"

import React, { use, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useArtifactTextContent } from "@/features/partner/api/artifact-content"
import { useArtifact, useUpdateArtifact, useUploadArtifactContent } from "@/features/partner/api/artifacts"
import { ApiError } from "@/features/partner/api/client"
import { useToast } from "@/features/partner/store/toast-provider"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  IconArrowLeft,
  IconUpload,
  IconFileZip,
  IconLock,
  IconWorld,
  IconLoader2,
  IconAlertTriangle,
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
  const [wasmFile, setWasmFile] = useState<File | null>(null)
  const [capabilitiesDraft, setCapabilitiesDraft] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
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
    if (capabilitiesText !== undefined && seededCapabilitiesIdRef.current !== id) {
      seededCapabilitiesIdRef.current = id
      // `capabilitiesText` is `null` for "no content row yet" (404) -- seed
      // an empty draft in that case, same as a genuinely empty stored file.
      setCapabilitiesDraft(capabilitiesText ?? "")
    }
  }, [capabilitiesText, id])

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
  const capabilitiesFailed = isCapabilitiesError && capabilitiesText === undefined
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
  const capabilitiesStaleRefreshFailed = isCapabilitiesError && capabilitiesText !== undefined

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
    // MUTATION TEST: temporarily removed to verify the test suite catches it.

    try {
      JSON.parse(capabilitiesDraft)
    } catch {
      setFormError("Capabilities must be valid JSON.")
      return
    }

    try {
      await updateArtifact.mutateAsync({ title, description, visibility })
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
      if (error instanceof ApiError) {
        setFormError(error.status === 409 ? `Duplicate: ${error.message}` : error.message)
      } else {
        setFormError(error instanceof Error ? error.message : "Failed to save changes.")
      }
    }
  }

  const isSaving = updateArtifact.isPending || uploadContent.isPending
  const saveDisabled = isSaving || !capabilitiesReady

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

      {capabilitiesFailed && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs font-semibold text-destructive">
          <IconAlertTriangle className="size-4 shrink-0" />
          <span>
            Could not load the stored capabilities.json
            {capabilitiesError instanceof Error ? `: ${capabilitiesError.message}` : "."} Saving is
            disabled so an empty editor can&apos;t overwrite the stored file.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetchCapabilities()}
            className="ml-auto h-7 shrink-0 rounded-full text-xs px-2.5"
          >
            Retry
          </Button>
        </div>
      )}

      {capabilitiesAbsent && (
        <div className="rounded-xl border border-[var(--ironhub-line)] bg-card/60 p-3 text-xs font-semibold text-muted-foreground">
          No capabilities.json is stored for this tool yet. Fill in the form below and save to
          create it.
        </div>
      )}

      {capabilitiesStaleRefreshFailed && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--ironhub-line)] bg-card/60 p-3 text-xs font-semibold text-muted-foreground">
          <IconAlertTriangle className="size-4 shrink-0" />
          <span>
            Couldn&apos;t refresh the stored capabilities.json. You&apos;re still editing the last
            version that loaded successfully, and saving is unaffected.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetchCapabilities()}
            className="ml-auto h-7 shrink-0 rounded-full text-xs px-2.5"
          >
            Retry
          </Button>
        </div>
      )}

      {isCapabilitiesLoading && (
        <div className="rounded-xl border border-[var(--ironhub-line)] bg-card/60 p-3 text-xs font-semibold text-muted-foreground">
          Loading stored capabilities.json…
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

          {/* Capabilities editor -- loaded from the stored capabilities.json
              via the owner-facing content read (design.md D4/2.6), not a
              blank/default document, so saving can't silently wipe it. */}
          <div className="flex flex-col gap-2 border-t border-[var(--ironhub-line)]/50 pt-4 mt-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">
              Capabilities (capabilities.json)
            </label>
            <textarea
              required
              disabled={!capabilitiesReady}
              value={capabilitiesDraft}
              onChange={(e) => setCapabilitiesDraft(e.target.value)}
              placeholder='{ "permissions": [] }'
              className="flex min-h-[100px] w-full rounded-2xl border border-[var(--ironhub-line)] bg-background/50 px-4 py-3 font-mono text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:opacity-60"
            />
            <span className="text-xs text-muted-foreground">
              Declares what the WASM package is permitted to access. Must be valid JSON.
            </span>
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

        <div className="rounded-xl border border-[var(--ironhub-line)] bg-card/60 p-4 shadow-sm flex flex-row items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild className="rounded-full">
            <Link href={`/mvp/manage/${id}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={saveDisabled} className="rounded-full px-6 shadow-sm">
            {isSaving && <IconLoader2 className="size-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
