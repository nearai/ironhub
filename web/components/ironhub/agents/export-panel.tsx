"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { slugifyAgentName } from "@/lib/agent-builder-utils"
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
    anchor.download = `${slugifyAgentName(agentName)}.ironclaw-agent.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="bg-card/80">
      <CardHeader>
        <CardTitle>Export config</CardTitle>
        <CardDescription>
          Copy or download the generated runtime-ready agent JSON.
        </CardDescription>
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
