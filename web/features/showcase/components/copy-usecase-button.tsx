"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { IconCopy, IconCheck } from "@tabler/icons-react"
import type { UseCase } from "@/lib/usecases/types"

interface CopyUsecaseButtonProps {
  useCase: UseCase
}

export function CopyUsecaseButton({ useCase }: CopyUsecaseButtonProps) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = () => {
    // Filter and sanitize skills list just like the card
    const sanitizedSkills = useCase.skillsAndTools
      .filter((s) => {
        if (!s || !s.name) return false
        const name = s.name.trim().toLowerCase()
        return (
          name !== "" &&
          name !== "unknown" &&
          name !== "na" &&
          name !== "n/a" &&
          name !== "none"
        )
      })
      .map((s) => `- ${s.name.replace(/`/g, "")}${s.url ? ` (${s.url})` : ""}`)
      .join("\n")

    const structuredText = `I want to build an AI workflow. Please help me set this up:

Task: ${useCase.title}
Example Prompt: "${useCase.examplePrompt}"
How it works: ${useCase.agentDoes}

Skills & Tools needed:
${sanitizedSkills}`

    navigator.clipboard.writeText(structuredText)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <Button
      onClick={handleCopy}
      className="relative z-20 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-5 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/95 sm:w-auto"
    >
      {isCopied ? (
        <>
          <IconCheck className="size-4" />
          Copied Usecase!
        </>
      ) : (
        <>
          <IconCopy className="size-4" />
          Copy Usecase
        </>
      )}
    </Button>
  )
}
