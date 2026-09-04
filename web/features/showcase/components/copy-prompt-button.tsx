"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { IconCopy, IconCheck } from "@tabler/icons-react"

interface CopyPromptButtonProps {
  promptText: string
}

export function CopyPromptButton({ promptText }: CopyPromptButtonProps) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <Button
      onClick={handleCopy}
      className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-95"
    >
      {isCopied ? (
        <>
          <IconCheck className="size-3.5" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <IconCopy className="size-3.5" />
          <span>Copy Prompt</span>
        </>
      )}
    </Button>
  )
}
