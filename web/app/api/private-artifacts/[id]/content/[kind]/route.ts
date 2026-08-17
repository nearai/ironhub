import { requireActiveOrganization } from "@/lib/auth/org-context"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"
import {
  describeLimit,
  MAX_CONTENT_BYTES_BY_KIND,
  parseContentKind,
  storeArtifactContent,
} from "@/lib/private-artifacts/content"
import { deletePrivateArtifactContentRow } from "@/lib/private-artifacts/service"
import { deleteObject } from "@/lib/storage"

type Params = {
  params: Promise<{ id: string; kind: string }>
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    assertSameOriginRequest(request)
    const { id, kind } = await params
    const contentKind = parseContentKind(kind)
    const maxBytes = MAX_CONTENT_BYTES_BY_KIND[contentKind]

    const bytes = Buffer.from(await request.arrayBuffer())
    if (bytes.length === 0) {
      throw new Response("Empty content body", { status: 400 })
    }
    // Fast path only: rejecting an oversized body before hashing/upload work
    // is cheaper and produces a request-shaped 413. `storeArtifactContent`
    // enforces the same D3 limit again unconditionally -- that's the
    // authoritative guard every caller (including bundle ingest) inherits.
    if (bytes.length > maxBytes) {
      throw new Response(
        `Content exceeds the ${describeLimit(maxBytes)} limit`,
        { status: 413 }
      )
    }

    const content = await storeArtifactContent(
      organizationId,
      id,
      contentKind,
      bytes
    )

    return Response.json({ content }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

// integration note: this DELETE handler is additive next to the PUT above
// (which wt-storage is rewriting for S3-backed uploads) to minimize merge
// surface — it does not modify the PUT handler or content.ts.
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    assertSameOriginRequest(request)
    const { id, kind } = await params
    const contentKind = parseContentKind(kind)

    await deletePrivateArtifactContentRow(organizationId, id, contentKind)

    try {
      await deleteObject(`private-artifacts/${organizationId}/${id}/${contentKind}`)
    } catch (storageError) {
      console.error(
        `Failed to delete storage object for artifact ${id} content ${contentKind}:`,
        storageError
      )
    }

    return new Response(null, { status: 204 })
  } catch (error) {
    return handleApiError(error)
  }
}
