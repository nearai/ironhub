import { createInstallIntent } from "@/lib/agent-installations/service"
import type {
  InstallArtifactType,
  InstallSource,
} from "@/lib/agent-installations/types"
import { requireAuthSession } from "@/lib/auth/session"
import {
  assertJsonMutationRequest,
  handleApiError,
  parseJsonObject,
  readOptionalString,
  readString,
} from "@/lib/http/api"

const INSTALL_SOURCES: readonly InstallSource[] = ["public", "private"]
const INSTALL_ARTIFACT_TYPES: readonly InstallArtifactType[] = [
  "tool",
  "skill",
  "soul",
]

export async function POST(request: Request) {
  try {
    const { user, session } = await requireAuthSession()
    assertJsonMutationRequest(request)
    const body = parseJsonObject(await request.json())
    const intent = await createInstallIntent({
      userId: user.id,
      slug: readString(body, "slug"),
      source: readEnum(body, "source", INSTALL_SOURCES),
      type: readEnum(body, "type", INSTALL_ARTIFACT_TYPES),
      agentInstallationId: readOptionalString(body, "agentInstallationId"),
      organizationId: session.activeOrganizationId ?? undefined,
    })

    return Response.json(intent)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * Reads a required literal field: `source` and `type` have no default, and
 * are not meant to acquire one. Every caller is in this repo and each already
 * knows which catalog it is on, so defaulting either would reintroduce the
 * invisible precedence this endpoint exists to remove -- for the caller least
 * likely to notice. The accepted values go into the message because a caller
 * that omitted the field has no other way to learn them.
 */
function readEnum<T extends string>(
  body: Record<string, unknown>,
  key: string,
  allowed: readonly T[]
): T {
  const value = body[key]

  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Response(`${key} must be one of: ${allowed.join(", ")}.`, {
      status: 400,
    })
  }

  return value as T
}
