export type AgentInstallationView = {
  id: string
  label: string
  agentUrl: string
  keyFingerprint: string
  isDefault: boolean
  verifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AgentInstallationInput = {
  label: string
  agentUrl: string
  sharedKey: string
  isDefault?: boolean
}

export type InstallIntentResponse = {
  redirectUrl: string
  message: string
  expiresAt: string
}

/**
 * Which catalog an install intent addresses.
 *
 * The public marketplace and an organization's private space are two flat
 * name spaces with nothing reserved between them, so a slug on its own does
 * not name a target: an organization may hold a private artifact called
 * `trader` while the marketplace publishes its own `trader`. The caller
 * states which catalog it is on rather than the hub applying a precedence
 * rule, because precedence hands back the other catalog's artifact silently
 * and cannot tell "no such entry" apart from "the org switcher is on the
 * wrong workspace" (design.md -- Decisions).
 */
export type InstallSource = "public" | "private"

/**
 * The artifact kind the caller expects behind the slug.
 *
 * Carried on the request so private resolution can assert what it found
 * rather than trust it: the private lookup is keyed on `(organizationId,
 * name)`, and every kind an organization owns -- tools, skills and souls
 * today, loadouts next -- shares that one name space.
 *
 * `soul` resolves against the private catalog in practice, whatever a soul's
 * visibility says. `visibility: "public"` marks a private artifact as
 * shareable; it does not move it into the public marketplace, which is built
 * from the IronHub release and the Iliad backend rather than from artifacts
 * authored here. A `source: "public"` request naming a soul therefore finds
 * nothing -- correctly, and without a type rule saying so.
 */
export type InstallArtifactType = "tool" | "skill" | "soul"
