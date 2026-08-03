import { buildUnifiedManifest } from "@/lib/catalog/manifest.server"
import { createVersionResolver, toVersionIndex } from "@/lib/catalog/versions"

const INDEX_CACHE_TTL_MS = 30_000
const INDEX_STALE_LIMIT_MS = 10 * 60_000

export const resolveVersionDocument = createVersionResolver({
  load: async () => toVersionIndex(await buildUnifiedManifest()),
  ttlMs: INDEX_CACHE_TTL_MS,
  staleMs: INDEX_STALE_LIMIT_MS,
  onStale: (error, ageMs) => {
    console.error(
      `Serving a ${Math.round(ageMs / 1000)}s stale catalog version index after a rebuild failure`,
      error
    )
  },
})
