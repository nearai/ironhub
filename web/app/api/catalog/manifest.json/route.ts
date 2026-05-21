import { NextResponse, type NextRequest } from "next/server"

import {
  buildUnifiedManifest,
  CatalogManifestError,
} from "@/lib/catalog/manifest.server"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest) {
  try {
    const manifest = await buildUnifiedManifest()

    return NextResponse.json(manifest, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    const status = error instanceof CatalogManifestError ? error.status : 500

    return NextResponse.json(
      { error: "Unable to build the IronHub catalog manifest." },
      { status }
    )
  }
}
