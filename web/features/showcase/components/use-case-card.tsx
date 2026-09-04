"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import type { UseCase } from "@/lib/usecases/types"
import {
  IconMessageCircle,
  IconArrowRight,
  IconLayersLinked,
  IconUserCircle,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react"
import Link from "next/link"

function stripMarkdownAndHtml(text: string): string {
  if (!text) return ""
  return (
    text
      // Remove HTML tags
      .replace(/<[^>]*>/g, "")
      // Remove Markdown headers (# Header)
      .replace(/^#+\s+/gm, "")
      // Remove bold/italic formatting
      .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
      // Remove links [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove image links ![alt](url) -> ""
      .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
      // Remove code blocks and inline code
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      // Remove bullet points / lists
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      // Replace multiple newlines/whitespaces with a single space
      .replace(/\s+/g, " ")
      .trim()
  )
}

export function UseCaseCard({ useCase }: { useCase: UseCase }) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const skillsList = useCase.skillsAndTools
      .map((s) => `- ${s.name}${s.url ? ` (${s.url})` : ""}`)
      .join("\n")

    const promptText = `I want to build an AI workflow. Please help me set this up:

Task: ${useCase.title}
Example Prompt: "${useCase.examplePrompt}"
How it works: ${useCase.agentDoes}

Skills & Tools needed:
${skillsList}`

    navigator.clipboard.writeText(promptText)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  // Filter out empty, unknown, N/A, or NA skill names
  const sanitizedSkills = useCase.skillsAndTools.filter((skill) => {
    if (!skill || !skill.name) return false
    const name = skill.name.trim().toLowerCase()
    return (
      name !== "" &&
      name !== "unknown" &&
      name !== "na" &&
      name !== "n/a" &&
      name !== "none"
    )
  })

  const visibleSkills = sanitizedSkills.slice(0, 3)
  const extraSkillsCount = sanitizedSkills.length - 3

  return (
    <Link
      href={`/usecases/${useCase.id}`}
      className="group block h-full w-full"
    >
      <Card className="flex h-full w-full flex-col overflow-hidden border-[var(--ironhub-line)] bg-card pb-0 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <CardHeader className="relative z-10 gap-2 pb-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {useCase.categories.map((category) => (
              <Badge
                key={category}
                variant="secondary"
                className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-[2px] text-[0.66rem] font-medium tracking-[0.02em] text-[#0072c9] hover:bg-primary/15 dark:text-[#83dcff]"
              >
                {category}
              </Badge>
            ))}
          </div>
          <CardTitle className="text-lg leading-snug font-black tracking-[-0.01em] transition-colors group-hover:text-primary">
            {useCase.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="relative z-10 flex flex-grow flex-col gap-5 pb-4">
          {/* The Prompt / Chat Bubble */}
          <div
            title={useCase.examplePrompt}
            className="selection-dark relative mt-2 cursor-help rounded-[16px] rounded-tl-sm border border-white/[0.08] bg-[var(--near-dark-grey)] p-4 text-sm text-white/90 shadow-md"
          >
            <div className="absolute -top-3 -left-1">
              <div className="rounded-full bg-primary p-1.5 text-primary-foreground shadow-sm">
                <IconMessageCircle className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className="line-clamp-3 leading-relaxed">
              &ldquo;{useCase.examplePrompt}&rdquo;
            </p>
          </div>

          {/* What the agent does */}
          <div
            className="mt-1 flex cursor-help flex-col gap-2"
            title={stripMarkdownAndHtml(useCase.agentDoes)}
          >
            <div className="flex items-center gap-1.5 text-primary">
              <IconLayersLinked className="h-3.5 w-3.5" />
              <span className="font-mono text-[0.66rem] font-medium tracking-[0.14em] uppercase">
                How it works
              </span>
            </div>
            <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {stripMarkdownAndHtml(useCase.agentDoes)}
            </p>
          </div>
        </CardContent>

        <CardFooter className="relative z-10 mt-auto flex flex-col items-start gap-4 border-t border-[var(--ironhub-line)]/50 bg-muted/40 pt-5 pb-6">
          <div className="flex w-full flex-col gap-2.5">
            <span className="font-mono text-[0.62rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Skills & Tools
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {visibleSkills.map((skill, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="rounded-[4px] border-border bg-transparent px-2 py-[2.5px] text-[0.66rem] font-medium tracking-normal text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                >
                  {skill.name.replace(/`/g, "")}
                </Badge>
              ))}
              {extraSkillsCount > 0 && (
                <span className="pl-0.5 text-[0.66rem] font-medium text-muted-foreground">
                  +{extraSkillsCount} more
                </span>
              )}
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="relative z-20 mt-1 w-full border-transparent bg-primary/10 font-medium text-primary transition-colors hover:bg-primary/20"
            onClick={handleCopy}
          >
            {isCopied ? (
              <>
                <IconCheck className="mr-2 h-4 w-4" /> Copied!
              </>
            ) : (
              <>
                <IconCopy className="mr-2 h-4 w-4" /> Copy Usecase
              </>
            )}
          </Button>

          {useCase.authorHandle && (
            <div className="mt-2 flex w-full items-center justify-between gap-1.5 font-mono text-[0.72rem] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <IconUserCircle className="h-3.5 w-3.5" />
                <span>By {useCase.authorHandle}</span>
              </div>
              {useCase.sourceUrl && (
                <a
                  href={useCase.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="relative z-20 flex items-center gap-1 font-medium transition-colors hover:text-primary"
                >
                  Source <IconArrowRight className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  )
}
