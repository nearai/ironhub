import { getCollectionBundle } from "@/lib/catalog/collections"
import { getMarketplaceCatalog } from "@/lib/catalog/server"
import {
  renderSocialCard,
  socialImageContentType,
  socialImageSize,
} from "@/lib/discovery/social-card"

export const alt = "IronHub curated collection"
export const size = socialImageSize
export const contentType = socialImageContentType

export default async function CollectionOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { items } = await getMarketplaceCatalog()
  const collection = getCollectionBundle(items, slug)

  return renderSocialCard({
    title: collection?.title || "IronHub Collection",
    label: "Curated Collection",
    description: collection?.outcome,
  })
}
