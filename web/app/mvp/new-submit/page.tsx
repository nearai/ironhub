"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePartnerStore } from "@/features/partner/store/partner-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Card } from "@/components/ui/card"
import {
  IconArrowLeft,
  IconBrandGithub,
  IconUpload,
  IconCheck,
  IconFileZip,
  IconWorld,
  IconLock,
} from "@tabler/icons-react"
import { PageHeader } from "@/features/shell/components/page-header"

export default function NewSubmitPage() {
  const router = useRouter()
  const { addSubmission } = usePartnerStore()

  // Form states
  const [method, setMethod] = useState<"github" | "upload">("github")
  const [title, setTitle] = useState("")
  const [type, setType] = useState<"tool" | "skill">("tool")
  const [repoUrl, setRepoUrl] = useState("github.com/circle-org/my-new-skill")
  const [branch, setBranch] = useState("main")
  const [version, setVersion] = useState("v1.0.0")
  const [entryPoint, setEntryPoint] = useState("main.wasm")
  const [visibility, setVisibility] = useState<"public" | "private">("private")

  // File upload mockup state
  const [zipFile, setZipFile] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setZipFile(e.target.files[0].name)
      if (!title) {
        const cleanName = e.target.files[0].name.replace(".zip", "")
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1))
      }
    }
  }

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.name.endsWith(".zip")) {
        setZipFile(file.name)
        if (!title) {
          const cleanName = file.name.replace(".zip", "")
          setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1))
        }
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const finalTitle = title || (method === "github" ? repoUrl.split("/").pop() || "Untitled Integration" : zipFile?.replace(".zip", "") || "Uploaded Asset")

    addSubmission({
      type,
      title: finalTitle,
      version: version || "v1.0.0",
      visibility,
      repoUrl: method === "github" ? repoUrl : `direct-upload://${zipFile || "package.zip"}`,
      branch: method === "github" ? branch : "N/A (Uploaded ZIP)",
      webhookActive: method === "github",
      entryPoint: entryPoint || (type === "tool" ? "main.wasm" : "index.js"),
      status: "in_review",
    })

    router.push("/mvp/dashboard")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation */}
      <div>
        <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground hover:text-foreground">
          <Link href="/mvp/dashboard">
            <IconArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <PageHeader
        eyebrow="Integration Pipeline"
        title="Submit New Skill / Tool"
        description="Register a new WASM execution tool or encrypted prompt agent for approval."
      />

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Form Details */}
        <div className="flex flex-col gap-6 md:col-span-2">
          <Card className="border border-[var(--ironhub-line)] bg-card/60 p-6 shadow-sm flex flex-col gap-5">
            {/* General parameters */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Integration Name
                </label>
                <Input
                  placeholder="e.g., My New Skill"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Integration Type
                </label>
                <NativeSelect
                  value={type}
                  onChange={(e) => {
                    const selected = e.target.value as "tool" | "skill"
                    setType(selected)
                    setEntryPoint(selected === "tool" ? "main.wasm" : "index.js")
                  }}
                  className="w-full rounded-full"
                >
                  <NativeSelectOption value="tool">WASM Tool (Binary executable)</NativeSelectOption>
                  <NativeSelectOption value="skill">AI Skill (Agent prompts / configs)</NativeSelectOption>
                </NativeSelect>
              </div>
            </div>

            {/* Method Toggle */}
            <div className="border-t border-[var(--ironhub-line)]/50 pt-5">
              <span className="text-xs font-bold text-muted-foreground uppercase block mb-3">
                Submission Source Method
              </span>
              <div className="flex rounded-full border border-[var(--ironhub-line)] p-1 bg-muted/20">
                <button
                  type="button"
                  onClick={() => setMethod("github")}
                  className={`flex-1 rounded-full py-1.5 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    method === "github"
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <IconBrandGithub className="size-4" />
                  GitHub Repository Link
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("upload")}
                  className={`flex-1 rounded-full py-1.5 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                    method === "upload"
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <IconUpload className="size-4" />
                  ZIP Direct Archive Upload
                </button>
              </div>
            </div>

            {/* GitHub parameters */}
            {method === "github" ? (
              <div className="grid gap-4 sm:grid-cols-2 border-t border-[var(--ironhub-line)]/50 pt-5">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Select Whitelisted Repository
                  </label>
                  <NativeSelect
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="w-full rounded-full"
                  >
                    <NativeSelectOption value="github.com/circle-org/my-new-skill">
                      github.com/circle-org/my-new-skill
                    </NativeSelectOption>
                    <NativeSelectOption value="github.com/circle-org/payment-gas-station">
                      github.com/circle-org/payment-gas-station
                    </NativeSelectOption>
                    <NativeSelectOption value="github.com/circle-org/sandbox-checker">
                      github.com/circle-org/sandbox-checker
                    </NativeSelectOption>
                  </NativeSelect>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Branch / Tag Name
                  </label>
                  <Input
                    placeholder="e.g., main"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Release Version Tag
                  </label>
                  <Input
                    placeholder="e.g., v1.0.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  />
                </div>


              </div>
            ) : (
              /* ZIP Dropzone details */
              <div className="flex flex-col gap-4 border-t border-[var(--ironhub-line)]/50 pt-5">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-[var(--ironhub-line)] bg-background/30 hover:border-primary/50"
                  }`}
                >
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    id="zip-upload-input"
                  />
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <IconUpload className="size-6 animate-bounce" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-foreground">
                    Drag and drop your .zip archive here
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    or click to browse files from your computer. Max size: 50MB.
                  </p>
                </div>

                {zipFile && (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-foreground font-semibold">
                    <span className="flex items-center gap-1.5">
                      <IconFileZip className="size-4 text-emerald-600" />
                      {zipFile}
                    </span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase font-bold flex items-center gap-0.5">
                      <IconCheck className="size-3" /> Ready
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Release Version Tag
                  </label>
                  <Input
                    placeholder="e.g., v1.0.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  />
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Settings & Submit */}
        <div className="flex flex-col gap-6">
          <Card className="border border-[var(--ironhub-line)] bg-card/60 p-5 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Visibility Settings
            </h3>

            <div className="flex flex-col gap-3">
              <label className="flex items-start gap-2.5 rounded-xl border border-[var(--ironhub-line)]/50 bg-background/30 p-3 hover:bg-muted/10 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={visibility === "public"}
                  onChange={() => setVisibility("public")}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <IconWorld className="size-3.5 text-muted-foreground" />
                    Public
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-normal block mt-0.5">
                    Register on the open IronHub directory for all users to explore and install.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 rounded-xl border border-[var(--ironhub-line)]/50 bg-background/30 p-3 hover:bg-muted/10 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={visibility === "private"}
                  onChange={() => setVisibility("private")}
                  className="mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <IconLock className="size-3.5 text-muted-foreground" />
                    Private
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-normal block mt-0.5">
                    Restrict tool access to organization members and sandboxed contexts.
                  </span>
                </div>
              </label>
            </div>

            <div className="border-t border-[var(--ironhub-line)]/50 pt-4 mt-2">
              <Button type="submit" className="w-full rounded-full shadow-sm">
                Submit Review
              </Button>
              <p className="mt-2.5 text-[10px] text-muted-foreground text-center leading-normal">
                Submissions automatically undergo security analysis and manifest scanning.
              </p>
            </div>
          </Card>
        </div>
      </form>
    </div>
  )
}
