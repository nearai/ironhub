import { markdownResponse, renderLlmsTxt } from "@/lib/discovery/markdown"

export function GET() {
  return markdownResponse(renderLlmsTxt(), "/")
}
