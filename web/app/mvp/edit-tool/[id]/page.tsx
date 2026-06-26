"use client"

import React, { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePartnerStore } from "@/features/partner/store/partner-store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  IconArrowLeft,
  IconUpload,
  IconFileZip,
  IconLock,
  IconWorld,
} from "@tabler/icons-react"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditToolPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { state, updateSubmission, notify } = usePartnerStore()
  const { submissions } = state

  const submission = submissions.find((sub) => sub.id === id)

  // Form states
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [version, setVersion] = useState("1.0.0")
  const [visibility, setVisibility] = useState<"public" | "private">("private")
  const [zipFile, setZipFile] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Seed form values when submission is loaded
  useEffect(() => {
    if (submission) {
      setTitle(submission.title)
      setDescription(submission.valueProp || "")
      setVersion(submission.version)
      setVisibility(submission.visibility)
      setZipFile(submission.sourceType === "upload" ? submission.sourceDetail : null)
    }
  }, [submission])

  if (!submission || submission.type !== "tool") {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-bold text-foreground">Tool not found</h3>
        <Button asChild variant="link" className="mt-2">
          <Link href="/mvp/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    )
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith(".zip") || file.name.endsWith(".wasm"))) {
      setZipFile(file.name)
      notify(`Selected package: ${file.name}`, "info")
    } else {
      notify("Only .zip or .wasm files are accepted", "error")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && (file.name.endsWith(".zip") || file.name.endsWith(".wasm"))) {
      setZipFile(file.name)
      notify(`Selected package: ${file.name}`, "info")
    } else {
      notify("Only .zip or .wasm files are accepted", "error")
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()

    updateSubmission(submission.id, {
      title,
      version,
      valueProp: description,
      visibility,
      sourceDetail: zipFile || "package.zip",
      status: "approved",
      reviews: [
        { name: "Safety & Policy Scan", status: "passed", details: "Safety re-scan passed successfully. Constraints verified." },
        { name: "Configuration Check", status: "passed", details: "All configuration elements correctly structured and validated." },
        { name: "Component Quality Check", status: "passed", details: "0 verification issues found in compilation." }
      ]
    })

    notify(`Changes saved for ${title}`)
    router.push(`/mvp/manage/${submission.id}`)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation */}
      <div>
        <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-foreground h-8 -ml-2 px-3">
          <Link href={`/mvp/manage/${submission.id}`}>
            <IconArrowLeft className="size-4" />
            Back to Item details
          </Link>
        </Button>
      </div>

      {/* Unified Header Card */}
      <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm">
        <div className="space-y-1">
          <span className="text-xs font-bold tracking-widest text-primary uppercase">
            Internal Catalog
          </span>
          <h1 className="mt-0.5 font-heading text-2xl font-bold leading-tight text-foreground">
            Edit {submission.title}
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            Update the title, description, version, package archive, and visibility settings for this tool.
          </p>
        </div>
      </Card>

      {/* Editor Form View */}
      <form onSubmit={handleSave} className="w-full flex flex-col gap-5">
        <Card className="border border-[var(--ironhub-line)] bg-card/60 p-6 shadow-sm flex flex-col gap-5">
          <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            1. Tool Metadata
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">
                Skill Name
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
                Version Code / Tag
              </label>
              <Input
                required
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="bg-background/50 text-sm rounded-full"
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

          {/* ZIP Dropzone */}
          <div className="flex flex-col gap-2 border-t border-[var(--ironhub-line)]/50 pt-4 mt-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">
              Tool File Package (.zip / .wasm)
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
                accept=".zip,.wasm"
                onChange={handleFileChange}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <IconUpload className="size-6 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground mt-2 block">
                Drag new ZIP or WASM file here, or click to browse
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                Supports .zip and .wasm packages up to 50MB
              </span>
            </div>

            {zipFile && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-foreground font-semibold mt-1">
                <span className="flex items-center gap-1.5">
                  <IconFileZip className="size-4 text-emerald-600" />
                  {zipFile}
                </span>
                <span className="text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase font-bold">
                  Ready
                </span>
              </div>
            )}
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
                    Internal to Circle Org Space only.
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

        {/* Cleaned Actions Bar */}
        <div className="rounded-xl border border-[var(--ironhub-line)] bg-card/60 p-4 shadow-sm flex flex-row items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild className="rounded-full">
            <Link href={`/mvp/manage/${submission.id}`}>Cancel</Link>
          </Button>
          <Button type="submit" className="rounded-full px-6 shadow-sm">
            Save & Publish
          </Button>
        </div>
      </form>
    </div>
  )
}
