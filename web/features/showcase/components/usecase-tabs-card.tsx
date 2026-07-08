"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconMessageCircle, IconLayersLinked, IconCopy, IconCheck } from "@tabler/icons-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface UsecaseTabsCardProps {
  examplePrompt: string
  agentDoes: string
}

export function UsecaseTabsCard({ examplePrompt, agentDoes }: UsecaseTabsCardProps) {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/30 bg-muted/30 px-5 py-2 dark:bg-muted/15 gap-3">
        <div className="flex items-center gap-2">
          {/* Tab Button: Example Prompt */}
          <button
            onClick={() => setActiveTab("prompt")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "prompt"
                ? "bg-primary/10 text-primary border-transparent"
                : "text-muted-foreground/85 hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <IconMessageCircle className="size-4" />
            Example Prompt
          </button>

          {/* Tab Button: Detailed Guide */}
          <button
            onClick={() => setActiveTab("guide")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === "guide"
                ? "bg-primary/10 text-primary border-transparent"
                : "text-muted-foreground/85 hover:text-foreground hover:bg-muted/50"
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
            className="h-8 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-transparent"
          >
            {isCopied ? (
              <>
                <IconCheck className="size-3.5 mr-1.5" />
                Copied Prompt!
              </>
            ) : (
              <>
                <IconCopy className="size-3.5 mr-1.5" />
                Copy Prompt
              </>
            )}
          </Button>
        )}
      </div>

      {/* Tabs Content */}
      <CardContent className="p-6">
        {activeTab === "prompt" ? (
          <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-900 dark:to-zinc-950 rounded-2xl rounded-tl-sm p-6 text-zinc-100 shadow-lg border border-zinc-800/50">
            <p className="font-medium text-base sm:text-lg tracking-tight leading-relaxed whitespace-pre-wrap select-all w-full">
              &ldquo;{examplePrompt}&rdquo;
            </p>
          </div>
        ) : (
          <div className="prose dark:prose-invert max-w-none text-muted-foreground">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ ...props }) => <h1 className="text-xl font-bold mt-6 mb-4 text-foreground" {...props} />,
                h2: ({ ...props }) => <h2 className="text-lg font-bold mt-5 mb-3 text-foreground" {...props} />,
                h3: ({ ...props }) => <h3 className="text-base font-bold mt-4 mb-2 text-foreground" {...props} />,
                p: ({ ...props }) => <p className="text-muted-foreground leading-relaxed mb-4 text-sm" {...props} />,
                ul: ({ ...props }) => <ul className="list-disc pl-5 mb-4 text-sm space-y-1.5 text-muted-foreground" {...props} />,
                ol: ({ ...props }) => <ol className="list-decimal pl-5 mb-4 text-sm space-y-1.5 text-muted-foreground" {...props} />,
                li: ({ ...props }) => <li className="pl-1" {...props} />,
                code: ({ children, ...props }) => (
                  <code className="bg-zinc-850 dark:bg-zinc-900 px-1.5 py-0.5 rounded text-xs font-mono text-zinc-200 border border-zinc-700/30" {...props}>
                    {children}
                  </code>
                ),
                pre: ({ ...props }) => (
                  <pre className="bg-zinc-950 dark:bg-zinc-950/80 p-4 rounded-xl overflow-x-auto my-4 text-xs font-mono text-zinc-200 border border-zinc-800" {...props} />
                ),
                img: ({ ...props }) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="rounded-xl border border-[var(--ironhub-line)]/30 my-6 max-w-full h-auto shadow-md" alt={props.alt || "Use case instruction illustration"} {...props} />
                ),
                a: ({ ...props }) => (
                  <a className="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />
                )
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
