// The guard that makes a mutable version safe.
//
// An artifact is one row, so its version string is the only thing telling an
// agent that what it would install today differs from what it installed
// yesterday. Nothing else can: the artifact digest is taken over content SHAs
// and never reaches the agent's version comparison, and there is no history to
// diff against. If the bytes behind a *published* artifact could be replaced
// while the version stayed put, that string would stop naming any particular
// set of bytes -- and loadout member pinning and the agent's own version
// comparison both lean on it doing exactly that.
//
// So while an artifact is published, its content and assets are frozen, and a
// version change is what releases them. The author cannot refill a version
// somebody may already be running; they can only mint a new one and fill that.
// This does not preserve the old bytes -- nothing here does -- but it does
// guarantee that changed bytes arrive under a changed name.
//
// Drafts are exempt: nothing outside the workspace has ever seen them.
//
// This lives in a module of its own rather than in content.ts or assets.ts
// because both of them enforce it, and so does service.ts's content-row
// delete. Housing it in any one of the three would make the other two import
// a sibling for a rule that belongs to none of them in particular.

/**
 * The artifact fields the freeze reads. Exported as a Prisma `select` so the
 * three call sites cannot drift apart on which columns they fetch -- each of
 * them already loads the artifact to prove org ownership, and this widens that
 * same query rather than adding a second one.
 */
export const PUBLISH_FREEZE_SELECT = {
  status: true,
  version: true,
  publishedVersion: true,
} as const

export type PublishFreezeFields = {
  status: string
  version: string
  publishedVersion: string | null
}

export function isArtifactContentFrozen(
  artifact: PublishFreezeFields
): boolean {
  if (artifact.status !== "published") return false

  // `publishedVersion` is null exactly while an artifact is a draft: publish
  // sets it, unpublish clears it, and the migration that introduced the column
  // backfilled every row that was already published. A published row without
  // one is therefore unreachable — and reading it as frozen would be a trap
  // rather than a safeguard, since no bump could ever equal null and the
  // artifact's files would be locked forever.
  if (artifact.publishedVersion === null) return false

  return artifact.publishedVersion === artifact.version
}

/**
 * Refuses a content or asset write on a published artifact whose version has
 * not moved since it was published.
 *
 * 409 rather than 400: the submitted bytes are not the problem, the artifact's
 * state is, and it is the same code publish uses for its own preconditions.
 * The message names the action that clears it, because an author who hits this
 * mid-upload has no other way to tell a freeze from a bug.
 */
export function assertArtifactContentUnfrozen(artifact: PublishFreezeFields) {
  if (!isArtifactContentFrozen(artifact)) return

  throw new Response(
    `This item is published at version ${artifact.version}. Change the version before changing its files, so an agent that already installed ${artifact.version} still gets the files it was given.`,
    { status: 409 }
  )
}
