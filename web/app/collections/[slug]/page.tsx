import {
  CollectionDetailScreen,
  generateCollectionStaticParams,
  type CollectionDetailScreenProps,
} from "@/features/collections/components/collection-detail-screen"

export const dynamic = "force-dynamic"

export const generateStaticParams = generateCollectionStaticParams

export default function CollectionDetailPage(
  props: CollectionDetailScreenProps
) {
  return <CollectionDetailScreen {...props} />
}
