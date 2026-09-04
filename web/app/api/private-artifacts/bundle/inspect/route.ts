import { requireActiveOrganization } from "@/lib/auth/org-context"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"
import { inspectExtensionBundle } from "@/lib/private-artifacts/bundle"

export async function POST(request: Request) {
  try {
    await requireActiveOrganization()
    assertSameOriginRequest(request)

    const bytes = new Uint8Array(await request.arrayBuffer())
    const inspected = inspectExtensionBundle(bytes)

    return Response.json({
      manifest: inspected.manifest,
      files: {
        wasm: inspected.wasmPath,
        capabilities: inspected.capabilitiesPath,
        // The paths the manifest declares, which is what upload will store
        // and what the agent will match against -- not every file that
        // happens to live under `schemas/` or `prompts/`. An author whose
        // archive carries an unreferenced file sees it absent here, which is
        // the honest preview of what publishing does with it.
        schemas: inspected.declaredSchemas,
        prompts: inspected.declaredPrompts,
      },
      totalUncompressedBytes: inspected.totalUncompressedBytes,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
