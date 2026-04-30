"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { IconCheck, IconCopy, IconDownload } from "@tabler/icons-react"

type ExportPanelProps = {
  agentName: string
  exportJson: string
}

export function ExportPanel({ agentName, exportJson }: ExportPanelProps) {
  const [copied, setCopied] = useState(false)

  async function copyConfig() {
    await navigator.clipboard.writeText(exportJson)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  function downloadConfig() {
    const blob = new Blob([exportJson], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${slugify(agentName)}.ironclaw-agent.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="bg-card/80">
      <CardHeader>
        <CardTitle>Export config</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={copyConfig}>
            {copied ? <IconCheck /> : <IconCopy />}
            {copied ? "Copied" : "Copy JSON"}
          </Button>
          <Button type="button" variant="outline" onClick={downloadConfig}>
            <IconDownload />
            Download
          </Button>
        </div>
        <pre className="max-h-80 overflow-auto rounded-xl border bg-background/60 p-4 text-xs leading-5 text-muted-foreground">
          {exportJson}
        </pre>
      </CardContent>
    </Card>
  )
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "ironclaw-agent"
  )
}
