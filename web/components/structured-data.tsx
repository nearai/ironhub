import { serializeJsonLd, type JsonLdValue } from "@/lib/discovery/json-ld"

export function StructuredData({
  data,
  id,
}: {
  data: JsonLdValue
  id?: string
}) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
