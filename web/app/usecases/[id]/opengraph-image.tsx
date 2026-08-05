import { getUseCaseById } from "@/lib/usecases/server"
import { summarizeDescription } from "@/lib/discovery/metadata"
import {
  renderSocialCard,
  socialImageContentType,
  socialImageSize,
} from "@/lib/discovery/social-card"

export const alt = "IronClaw use case on IronHub"
export const size = socialImageSize
export const contentType = socialImageContentType

export default async function UseCaseOpenGraphImage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const useCase = await getUseCaseById(id)

  return renderSocialCard({
    title: useCase?.title || "IronClaw Use Case",
    label: "Community Use Case",
    description: summarizeDescription(useCase?.examplePrompt),
  })
}
