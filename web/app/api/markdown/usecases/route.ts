import {
  markdownResponse,
  renderUseCasesIndexMarkdown,
} from "@/lib/discovery/markdown"
import { getUseCases } from "@/lib/usecases/server"

export const dynamic = "force-static"

export async function GET() {
  const useCases = await getUseCases()
  return markdownResponse(renderUseCasesIndexMarkdown(useCases), "/usecases")
}
