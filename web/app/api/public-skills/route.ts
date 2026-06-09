import { NextResponse, type NextRequest } from "next/server"

import {
  fetchIliadPublicSkillsList,
  getIliadErrorResponse,
} from "@/lib/iliad/public-skills.server"
import type { IliadPublicSkillsListParams } from "@/lib/iliad/public-skills-types"
import { tokenizeIliadSkillUrls } from "@/lib/iliad/public-skills-utils"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const params = getListParams(request.nextUrl.searchParams)
    const result = await fetchIliadPublicSkillsList(params)
    const tokenized = {
      ...result,
      skills: result.skills.map(tokenizeIliadSkillUrls),
    }

    return NextResponse.json(tokenized)
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
