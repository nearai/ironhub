// The artifact types Private Space supports, and the words the workspace uses
// for them.
//
// Split out of service.ts so a client component can read the list without
// pulling the Prisma client into the browser bundle. That split is what makes
// the navigation derivable: the Catalog sub-items and the catalog page's type
// filter are built from this tuple rather than restated beside it, so the next
// type to be accepted server-side appears in both without a second edit
// (design.md -- "Type sub-items are derived from the supported type list").

export const ARTIFACT_TYPES = ["skill", "tool", "soul", "loadout"] as const

export type ArtifactType = (typeof ARTIFACT_TYPES)[number]

export type ArtifactTypeLabels = {
  /** "Skill" -- naming one item. */
  singular: string
  /** "Skills" -- naming the collection, which is what a nav sub-item is. */
  plural: string
}

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, ArtifactTypeLabels> = {
  skill: { singular: "Skill", plural: "Skills" },
  tool: { singular: "Tool", plural: "Tools" },
  soul: { singular: "Soul", plural: "Souls" },
  loadout: { singular: "Loadout", plural: "Loadouts" },
}

export function isArtifactType(value: string): value is ArtifactType {
  return (ARTIFACT_TYPES as readonly string[]).includes(value)
}
