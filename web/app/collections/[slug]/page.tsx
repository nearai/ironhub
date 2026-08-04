import {
  CollectionDetailScreen,
  generateCollectionStaticParams,
  type CollectionDetailScreenProps,
} from "@/features/collections/components/collection-detail-screen"
import { getCollectionBundle } from "@/lib/catalog/collections"
import { getMarketplaceCatalog } from "@/lib/catalog/server"
import {
  buildPrivateMetadata,
  buildPublicMetadata,
} from "@/lib/discovery/metadata"

export const dynamic = "force-dynamic"

export const generateStaticParams = generateCollectionStaticParams

export async function generateMetadata({
  params,
}: CollectionDetailScreenProps) {
  const { slug } = await params
  const { items } = await getMarketplaceCatalog()
  const collection = getCollectionBundle(items, slug)

  if (!collection) return buildPrivateMetadata("Collection Not Found")

  const path = `/collections/${collection.slug}`

  return buildPublicMetadata({
    title: collection.title,
    description: collection.outcome,
    path,
    markdownPath: `${path}.md`,
    imagePath: `${path}/opengraph-image`,
    imageAlt: `${collection.title} collection on IronHub`,
  })
}

export default function CollectionDetailPage(
  props: CollectionDetailScreenProps
) {
  return <CollectionDetailScreen {...props} />
}
