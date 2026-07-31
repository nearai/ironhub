import { NextResponse } from "next/server"

import { CatalogManifestError } from "@/lib/catalog/manifest.server"
import { signDocument } from "@/lib/catalog/manifest-signing.server"
import { resolveVersionDocument } from "@/lib/catalog/versions.server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const since = new URL(request.url).searchParams.get("since")
    const document = await resolveVersionDocument(since)

    return NextResponse.json(signDocument(document), {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    const status = error instanceof CatalogManifestError ? error.status : 500

    return NextResponse.json(
      { error: "Unable to build the IronHub catalog version index." },
      { status }
    )
  }
}
