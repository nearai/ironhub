"use client"

import { IconCopy } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

type CopyButtonProps = {
  value: string
  label: string
  className?: string
}

export function CopyButton({ value, label, className }: CopyButtonProps) {
  const copy = async () => {
    if (!value) return
    await navigator.clipboard.writeText(value)
  }

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      className={className}
      aria-label={label}
      title={label}
      disabled={!value}
      onClick={copy}
    >
      <IconCopy className="size-4" />
    </Button>
  )
}
