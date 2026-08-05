import {
  markdownNotFound,
  markdownResponse,
  renderUseCaseMarkdown,
} from "@/lib/discovery/markdown"
import { getUseCaseById, getUseCases } from "@/lib/usecases/server"

export const dynamic = "force-static"
export const dynamicParams = false

export async function generateStaticParams() {
  const useCases = await getUseCases()
  return useCases.map((useCase) => ({ id: useCase.id }))
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const useCase = await getUseCaseById(id)

  if (!useCase) return markdownNotFound()

  return markdownResponse(
    renderUseCaseMarkdown(useCase),
    `/usecases/${useCase.id}`
  )
}
