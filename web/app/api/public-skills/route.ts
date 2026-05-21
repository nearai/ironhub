import { NextResponse, type NextRequest } from "next/server"

import {
  fetchIliadPublicSkillsList,
  getIliadErrorResponse,
} from "@/lib/iliad/public-skills.server"
import type { IliadPublicSkillsListParams } from "@/lib/iliad/public-skills-types"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const params = getListParams(request.nextUrl.searchParams)
    const result = await fetchIliadPublicSkillsList(params)

    return NextResponse.json(result)
  } catch (error) {
    const response = getIliadErrorResponse(error)

    return NextResponse.json(
      { error: response.message },
      { status: response.status }
    )
  }
}

function getListParams(
  searchParams: URLSearchParams
): IliadPublicSkillsListParams {
  const kind = searchParams.get("kind")

  return {
    q: searchParams.get("q") ?? undefined,
    kind: kind === "skill" || kind === "tool" ? kind : undefined,
    category: searchParams.get("category") ?? undefined,
    limit: toInteger(searchParams.get("limit")),
    offset: toInteger(searchParams.get("offset")),
  }
}

function toInteger(value: string | null) {
  if (!value) {
    return undefined
  }

  const parsed = Number(value)

  return Number.isInteger(parsed) ? parsed : undefined
}
