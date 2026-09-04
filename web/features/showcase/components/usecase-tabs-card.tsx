"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  IconMessageCircle,
  IconLayersLinked,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface UsecaseTabsCardProps {
  examplePrompt: string
  agentDoes: string
}

export function UsecaseTabsCard({
  examplePrompt,
  agentDoes,
}: UsecaseTabsCardProps) {
  const [activeTab, setActiveTab] = useState<"prompt" | "guide">("prompt")
  const [isCopied, setIsCopied] = useState(false)

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(examplePrompt)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <Card className="gap-0 overflow-hidden border border-[var(--ironhub-line)] bg-card/60 py-0 shadow-[var(--ironhub-shadow)] backdrop-blur-xl">
      {/* Tabs Header Bar */}
      <div className="flex flex-col justify-between gap-3 border-b border-border/30 bg-muted/30 px-5 py-2 sm:flex-row sm:items-center dark:bg-muted/15">
        <div className="flex items-center gap-2">
          {/* Tab Button: Example Prompt */}
          <button
            onClick={() => setActiveTab("prompt")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wider uppercase transition-all ${
              activeTab === "prompt"
                ? "border-transparent bg-primary/10 text-primary"
                : "text-muted-foreground/85 hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <IconMessageCircle className="size-4" />
            Example Prompt
          </button>

          {/* Tab Button: Detailed Guide */}
          <button
            onClick={() => setActiveTab("guide")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wider uppercase transition-all ${
              activeTab === "guide"
                ? "border-transparent bg-primary/10 text-primary"
                : "text-muted-foreground/85 hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <IconLayersLinked className="size-4" />
            Detailed Guide
          </button>
        </div>

        {/* Tab-Specific Action Button (Copy Prompt in Header next to triggers) */}
        {activeTab === "prompt" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCopyPrompt}
            className="h-8 border-transparent bg-primary/10 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            {isCopied ? (
              <>
                <IconCheck className="mr-1.5 size-3.5" />
                Copied Prompt!
              </>
            ) : (
              <>
                <IconCopy className="mr-1.5 size-3.5" />
                Copy Prompt
              </>
            )}
          </Button>
        )}
      </div>

      {/* Tabs Content */}
      <CardContent className="p-6">
        {activeTab === "prompt" ? (
          <div className="rounded-2xl rounded-tl-sm border border-zinc-800/50 bg-gradient-to-r from-zinc-900 to-zinc-800 p-6 text-zinc-100 shadow-lg dark:from-zinc-900 dark:to-zinc-950">
            <p className="w-full text-base leading-relaxed font-medium tracking-tight whitespace-pre-wrap select-all sm:text-lg">
              &ldquo;{examplePrompt}&rdquo;
            </p>
          </div>
        ) : (
          <div className="prose dark:prose-invert max-w-none text-muted-foreground">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ ...props }) => (
                  <h1
                    className="mt-6 mb-4 text-xl font-bold text-foreground"
                    {...props}
                  />
                ),
                h2: ({ ...props }) => (
                  <h2
                    className="mt-5 mb-3 text-lg font-bold text-foreground"
                    {...props}
                  />
                ),
                h3: ({ ...props }) => (
                  <h3
                    className="mt-4 mb-2 text-base font-bold text-foreground"
                    {...props}
                  />
                ),
                p: ({ ...props }) => (
                  <p
                    className="mb-4 text-sm leading-relaxed text-muted-foreground"
                    {...props}
                  />
                ),
                ul: ({ ...props }) => (
                  <ul
                    className="mb-4 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground"
                    {...props}
                  />
                ),
                ol: ({ ...props }) => (
                  <ol
                    className="mb-4 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground"
                    {...props}
                  />
                ),
                li: ({ ...props }) => <li className="pl-1" {...props} />,
                code: ({ children, ...props }) => (
                  <code
                    className="bg-zinc-850 rounded border border-zinc-700/30 px-1.5 py-0.5 font-mono text-xs text-zinc-200 dark:bg-zinc-900"
                    {...props}
                  >
                    {children}
                  </code>
                ),
                pre: ({ ...props }) => (
                  <pre
                    className="my-4 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-200 dark:bg-zinc-950/80"
                    {...props}
                  />
                ),
                img: ({ ...props }) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="my-6 h-auto max-w-full rounded-xl border border-[var(--ironhub-line)]/30 shadow-md"
                    alt={props.alt || "Use case instruction illustration"}
                    {...props}
                  />
                ),
                a: ({ ...props }) => (
                  <a
                    className="font-medium text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  />
                ),
              }}
            >
              {agentDoes}
            </ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
