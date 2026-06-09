import { NextResponse } from "next/server"

import {
  buildUnifiedManifest,
  CatalogManifestError,
} from "@/lib/catalog/manifest.server"
import { signManifest } from "@/lib/catalog/manifest-signing.server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const manifest = await buildUnifiedManifest()
    const envelope = signManifest(manifest)

    return NextResponse.json(envelope, {
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
