"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import type { UseCase } from "@/lib/usecases/types"
import { IconMessageCircle, IconArrowRight, IconLayersLinked, IconUserCircle, IconCopy, IconCheck } from "@tabler/icons-react"
import Link from "next/link"

function stripMarkdownAndHtml(text: string): string {
  if (!text) return ""
  return text
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
    return name !== "" && name !== "unknown" && name !== "na" && name !== "n/a" && name !== "none"
  })

  const visibleSkills = sanitizedSkills.slice(0, 3)
  const extraSkillsCount = sanitizedSkills.length - 3

  return (
    <Link href={`/usecases/${useCase.id}`} className="group block w-full h-full">
      <Card className="w-full h-full flex flex-col transition-all duration-300 border-[var(--ironhub-line)] bg-card overflow-hidden group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:border-primary/30 pb-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <CardHeader className="pb-3 gap-2 relative z-10">
          <div className="flex flex-wrap gap-2 mb-2">
            {useCase.categories.map((category) => (
              <Badge key={category} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent font-medium rounded-full">
                {category}
              </Badge>
            ))}
          </div>
          <CardTitle className="text-xl leading-tight font-semibold tracking-tight group-hover:text-primary transition-colors">
            {useCase.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex flex-col gap-5 flex-grow pb-4 relative z-10">
          {/* The Prompt / Chat Bubble */}
          <div 
            title={useCase.examplePrompt}
            className="bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-900 dark:to-zinc-950 rounded-2xl rounded-tl-sm p-4 text-sm text-zinc-100 relative mt-2 shadow-md selection-dark border border-zinc-800/50 cursor-help"
          >
            <div className="absolute -top-3 -left-1">
              <div className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-sm">
                <IconMessageCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="font-medium tracking-tight leading-relaxed line-clamp-3">&ldquo;{useCase.examplePrompt}&rdquo;</p>
          </div>

          {/* What the agent does */}
          <div 
            className="flex flex-col gap-2 mt-1 cursor-help"
            title={stripMarkdownAndHtml(useCase.agentDoes)}
          >
            <div className="flex items-center gap-1.5 text-primary">
              <IconLayersLinked className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">How it works</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {stripMarkdownAndHtml(useCase.agentDoes)}
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-start gap-4 mt-auto border-t border-[var(--ironhub-line)]/50 pt-5 pb-6 bg-muted/40 relative z-10">
          <div className="flex flex-col gap-2.5 w-full">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">Skills & Tools</span>
            <div className="flex flex-wrap gap-1.5 items-center">
              {visibleSkills.map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-background/80 hover:bg-background border-border/80 transition-colors">
                  {skill.name.replace(/`/g, "")}
                </Badge>
              ))}
              {extraSkillsCount > 0 && (
                <span className="text-xs text-muted-foreground font-semibold pl-1">
                  +{extraSkillsCount} more
                </span>
              )}
            </div>
          </div>

          <Button 
            variant="secondary" 
            size="sm" 
            className="w-full mt-1 bg-primary/10 text-primary hover:bg-primary/20 border-transparent transition-colors font-medium relative z-20"
            onClick={handleCopy}
          >
            {isCopied ? (
              <><IconCheck className="w-4 h-4 mr-2" /> Copied!</>
            ) : (
              <><IconCopy className="w-4 h-4 mr-2" /> Copy Usecase</>
            )}
          </Button>
          
          {useCase.authorHandle && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2 w-full justify-between">
              <div className="flex items-center gap-1.5">
                <IconUserCircle className="w-3.5 h-3.5" />
                <span>By {useCase.authorHandle}</span>
              </div>
              {useCase.sourceUrl && (
                <a 
                  href={useCase.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={(e) => e.stopPropagation()} 
                  className="flex items-center gap-1 hover:text-primary transition-colors font-medium relative z-20"
                >
                  Source <IconArrowRight className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  )
}
