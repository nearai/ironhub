import { NextResponse, type NextRequest } from "next/server"

import {
  CatalogManifestError,
  decodeArtifactRef,
  resolveArtifactUpstreamUrl,
} from "@/lib/catalog/manifest.server"

type ArtifactRouteContext = {
  params: Promise<{ token: string }>
}

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  context: ArtifactRouteContext
) {
  try {
    const { token } = await context.params
    const ref = decodeArtifactRef(token)
    const upstreamUrl = await resolveArtifactUpstreamUrl(ref)

    const upstream = await fetch(upstreamUrl, { cache: "no-store" })
    if (!upstream.ok || !upstream.body) {
      throw new CatalogManifestError(
        `Upstream artifact request failed with ${upstream.status}.`,
        502
      )
    }

    const headers = new Headers({
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/octet-stream",
      "Cache-Control": "no-store",
    })
    const length = upstream.headers.get("Content-Length")
    if (length) {
      headers.set("Content-Length", length)
    }

    return new Response(upstream.body, { status: 200, headers })
  } catch (error) {
    const status = error instanceof CatalogManifestError ? error.status : 500

    return NextResponse.json({ error: "Unable to fetch artifact." }, { status })
  }
}
