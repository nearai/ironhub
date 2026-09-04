import { requireActiveOrganization } from "@/lib/auth/org-context"
import { assertSameOriginRequest, handleApiError } from "@/lib/http/api"
import {
  CONTENT_MEDIA_TYPES,
  contentDownloadFilename,
  describeLimit,
  getArtifactContentMetadata,
  MAX_CONTENT_BYTES_BY_KIND,
  parseContentKind,
  REDIRECT_CONTENT_KINDS,
  storeArtifactContent,
} from "@/lib/private-artifacts/content"
import { relayStoredObject } from "@/lib/private-artifacts/relay"
import {
  deletePrivateArtifactContentRow,
  getPrivateArtifact,
} from "@/lib/private-artifacts/service"
import { deleteObject, getPresignedDownloadUrl } from "@/lib/storage"

type Params = {
  params: Promise<{ id: string; kind: string }>
}

const PRESIGNED_URL_TTL_SECONDS = 300

// GET is the owner-facing read path (design.md D4): an active-org session is
// enough, no install token required, and there is no same-origin guard since
// GET is a safe method. `getArtifactContentMetadata` already scopes the
// lookup to the caller's organization and returns the same 404 for both
// "artifact isn't in this org" and "no content of this kind" -- that's
// intentional, it's what keeps this route from leaking artifact existence
// across orgs.
export async function GET(request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    const { id, kind } = await params
    const contentKind = parseContentKind(kind)

    const content = await getArtifactContentMetadata(
      organizationId,
      id,
      contentKind
    )

    // `?download=1` is opt-in: the edit pages read these same URLs to seed
    // their editors and must keep getting an inline body. Only the explicit
    // download affordance asks to be saved to disk, and only then is the
    // artifact looked up for its name.
    const wantsDownload =
      new URL(request.url).searchParams.get("download") === "1"
    const contentDisposition = wantsDownload
      ? `attachment; filename="${contentDownloadFilename(
          contentKind,
          (await getPrivateArtifact(organizationId, id)).name
        )}"`
      : undefined

    // This route MAY redirect where its agent-facing sibling
    // (`[token]/route.ts`) may not, and the two must not be "unified" by
    // giving both the same answer. The caller here is a browser, which
    // follows a cross-host 302 without further ado, so handing it a presigned
    // URL keeps tens of megabytes of wasm and archive bytes out of this
    // process. The agent re-authorizes every redirect hop against a network
    // policy pinned to the hub's host alone, so the same 302 is denied there
    // (C5 / design.md D2). Same bytes, different transport, because the two
    // clients enforce different rules about where those bytes may come from.
    // A download is relayed even for the redirect kinds. The 302 hands the
    // browser a URL on the object store's own host, which is a second network
    // path that does not have to be reachable from wherever the browser runs
    // — in the dev stack it is not, and the download simply fails. Those bytes
    // only ever move when a person clicks Download, so paying to stream them
    // through this process buys a link that works on every deployment
    // topology, and lets the filename be set here rather than signed into a
    // URL.
    if (REDIRECT_CONTENT_KINDS.has(contentKind) && !wantsDownload) {
      const url = await getPresignedDownloadUrl(
        content.storageKey,
        PRESIGNED_URL_TTL_SECONDS
      )
      return new Response(null, {
        status: 302,
        headers: { Location: url, "Cache-Control": "no-store" },
      })
    }

    const response = await relayStoredObject({
      storageKey: content.storageKey,
      sizeBytes: content.sizeBytes,
      contentType: CONTENT_MEDIA_TYPES[contentKind],
    })
    if (contentDisposition) {
      response.headers.set("Content-Disposition", contentDisposition)
    }
    return response
  } catch (error) {
    return handleApiError(error)
  }
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

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    assertSameOriginRequest(request)
    const { id, kind } = await params
    const contentKind = parseContentKind(kind)

    await deletePrivateArtifactContentRow(organizationId, id, contentKind)

    try {
      await deleteObject(
        `private-artifacts/${organizationId}/${id}/${contentKind}`
      )
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
