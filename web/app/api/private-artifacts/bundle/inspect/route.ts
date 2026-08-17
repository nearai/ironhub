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
        schemas: inspected.schemaFiles,
        prompts: inspected.promptFiles,
      },
      totalUncompressedBytes: inspected.totalUncompressedBytes,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
