// The HTTP surface for a loadout's items.
//
// "Item" is where the rename stops. The workspace calls artifacts items
// everywhere an owner can read it -- the catalog header counts "18 Total
// items" -- so "member" was the outlier here, and it reads as people besides.
// Below this boundary the vocabulary stays `member`: the Prisma model, the
// resolved shapes, `memberId`, and the specs all keep it, because those are
// the words IronClaw is reading right now to answer asks 3, 4 and 5, and
// renaming them would churn a document under active review for no gain on
// either side (design.md -- "Items on the outside, members underneath").
//
// So: the paths and the JSON envelopes say `items`; the values inside them are
// `ResolvedMember`-shaped and stay that way. Do not "finish the job" into
// lib/.
import { requireActiveOrganization } from "@/lib/auth/org-context"
import {
  assertJsonMutationRequest,
  handleApiError,
  parseJsonObject,
  readOptionalString,
  readString,
} from "@/lib/http/api"
import {
  type AddLoadoutMemberInput,
  LOADOUT_MEMBER_KINDS,
  type LoadoutMemberKind,
  addLoadoutMember,
} from "@/lib/private-artifacts/loadout-composition"
import { readLoadoutHealth } from "@/lib/private-artifacts/loadout-health"

type Params = {
  params: Promise<{ id: string }>
}

/**
 * Serves resolved members, not stored rows.
 *
 * The stored row says what was pinned; it cannot say whether that pin still
 * describes anything. Every question the loadout screen asks -- is this member
 * a draft, has it drifted, was it updated upstream, can this loadout still be
 * installed -- is answered by the resolution, so the resolution is what the
 * read returns.
 *
 * Through `readLoadoutHealth` rather than `resolveLoadoutMembers` because that
 * is where the lazy re-verification lives: a loadout marked stale by the
 * upstream release poll is re-verified while it is being read
 * (loadout-member-health -- "Verification runs lazily on read"). Reading is
 * the only thing that triggers that mark, so a read that skipped it would
 * leave the mark unobservable. An install does not come through here -- it
 * verifies unconditionally.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    const { id } = await params
    const health = await readLoadoutHealth({ loadoutId: id, organizationId })

    return Response.json({ items: health.members })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { organizationId } = await requireActiveOrganization()
    assertJsonMutationRequest(request)
    const { id } = await params
    const body = parseJsonObject(await request.json())

    const item = await addLoadoutMember(
      organizationId,
      id,
      readMemberInput(body)
    )

    return Response.json({ item }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * The two sources are identified differently and that is not incidental: a
 * private member is a row this hub stores and is addressed by its id, while a
 * public member is an entry this hub only resolves and is addressed by the
 * name it carries upstream. Accepting either field for either source would
 * invite a body naming an upstream entry that the private path would then look
 * up as a row id, so the source picks the field rather than the caller.
 */
function readMemberInput(
  body: Record<string, unknown>
): AddLoadoutMemberInput {
  const source = readString(body, "source")

  if (source === "private") {
    return { source, artifactId: readString(body, "artifactId") }
  }
  if (source === "public") {
    const kind = readOptionalString(body, "kind")
    if (kind !== undefined && !isLoadoutMemberKind(kind)) {
      throw new Response(`Invalid kind: ${kind}`, { status: 400 })
    }
    // Optional, and only ever needed to disambiguate a name published upstream
    // as both a tool and a skill.
    return { source, name: readString(body, "name"), kind }
  }

  throw new Response(`Invalid source: ${source}`, { status: 400 })
}

function isLoadoutMemberKind(value: string): value is LoadoutMemberKind {
  return (LOADOUT_MEMBER_KINDS as readonly string[]).includes(value)
}
