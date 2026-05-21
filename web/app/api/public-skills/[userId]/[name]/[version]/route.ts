import { NextResponse, type NextRequest } from "next/server"

import {
  fetchIliadPublicSkill,
  getIliadErrorResponse,
} from "@/lib/iliad/public-skills.server"
import { tokenizeIliadSkillUrls } from "@/lib/iliad/public-skills-utils"

type PublicSkillRouteContext = {
  params: Promise<{
    userId: string
    name: string
    version: string
  }>
}

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  context: PublicSkillRouteContext
) {
  try {
    const { userId, name, version } = await context.params
    const result = await fetchIliadPublicSkill(userId, name, version)

    return NextResponse.json(tokenizeIliadSkillUrls(result))
  } catch (error) {
    const response = getIliadErrorResponse(error)

    return NextResponse.json(
      { error: response.message },
      { status: response.status }
    )
  }
}
