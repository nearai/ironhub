// The one URL the agent will accept a private manifest and its artifacts from.
//
// `NEXT_PUBLIC_APP_URL` is cosmetic for most of this app -- a canonical link,
// an OAuth recipient -- and correctness-critical for exactly one path: the
// manifest a private install hands to an agent. The agent pins its catalog
// origin from its own configuration and then re-validates the private manifest
// URL and *every* artifact URL inside it against that origin (C1/C2). A base
// URL that disagrees produces a manifest that is signed, well-formed, and
// rejected with an error naming the agent's configuration rather than ours.
//
// So this module converts a remote, confusing failure into a local, specific
// one. It encodes the agent's own `host_is_disallowed_target`
// (`ironclaw:crates/extensions/ironclaw_extension_manager/src/ironhub/catalog.rs:549`)
// plus the scheme and user-info halves of `CatalogOrigin::matches` (`:522`).
//
// What it deliberately does NOT encode is C3: the agent additionally requires
// its *configured* catalog URL to be `hub.ironclaw.com`, `github.com`, or a
// `*.githubusercontent.com` host (`service.rs` `validated_manifest_url` ->
// `artifact_hosts.rs` `is_allowed_artifact_host`). That allowlist is the filed
// upstream issue "catalog-origin lock-in": enforcing it here would bake a
// third-party hostname into this hub as a hard requirement and make a
// self-hosted deployment unconfigurable at exactly the moment upstream fixes
// it. We check what is legitimately ours to check, and document the rest.
import ipaddr from "ipaddr.js"

import {
  LOCAL_ORIGINS_SETTING,
  announceLocalOrigins,
  isLocalHost,
  localOriginsAllowed,
} from "@/lib/shared/local-origins"

/** Named in every message below, because the fix is always to change it. */
export const CATALOG_ORIGIN_SETTING = "NEXT_PUBLIC_APP_URL"

/**
 * Appended to every rejection the flag would have prevented, so the message
 * says both what broke and the one supported way to make it stop breaking on a
 * developer machine.
 */
const LOCAL_HINT = ` For local end-to-end testing set ${LOCAL_ORIGINS_SETTING}=true (development builds only).`

/**
 * `ironclaw:.../ironhub/catalog.rs:558-567`, verbatim and in the same order.
 * `.localhost` is in the agent's list even though the dotless rule below
 * already covers bare `localhost`; kept in step rather than deduplicated.
 */
const INTERNAL_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".lan",
  ".home",
  ".corp",
  ".private",
]

/**
 * Thrown rather than returned. Every caller is either building an agent-facing
 * manifest -- where there is no degraded mode, only a manifest the agent will
 * refuse -- or is publish-time verification, which catches this and reports it
 * as a named failure on the artifact screen.
 *
 * A route that answers HTTP maps this to a 500: the request was fine, the
 * deployment is not, and a 400 would send whoever is on call looking at the
 * caller instead of at the environment.
 */
export class CatalogOriginError extends Error {}

/**
 * Validates the configured base URL and returns it with any trailing slashes
 * removed, so a caller may concatenate a path onto it directly.
 *
 * Every rejection names the setting and says which rule the value broke,
 * because "invalid URL" against an env var that looks fine in a browser is
 * the least actionable message this could produce.
 */
export function assertCatalogOriginBaseUrl(
  value: string | undefined | null
): string {
  if (!value) {
    throw new CatalogOriginError(
      `${CATALOG_ORIGIN_SETTING} is not set; a private install cannot build a manifest URL the agent will accept`
    )
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new CatalogOriginError(
      `${CATALOG_ORIGIN_SETTING} is not a valid URL: ${value}`
    )
  }

  // Scheme and host are the two rules the local-origins flag relaxes, and only
  // for a host that names this machine or its private network. Everything below
  // them applies either way.
  const local = localOriginsAllowed() && isLocalHost(parsed.hostname)
  if (local) {
    announceLocalOrigins()
  }

  if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) {
    throw new CatalogOriginError(
      `${CATALOG_ORIGIN_SETTING} must be an https URL; the agent rejects any other scheme for a catalog origin (${value})` +
        (localOriginsAllowed() ? "" : LOCAL_HINT)
    )
  }
  if (parsed.username !== "" || parsed.password !== "") {
    throw new CatalogOriginError(
      `${CATALOG_ORIGIN_SETTING} must not carry user information; the agent rejects a catalog origin with credentials in it`
    )
  }
  // A path, query, or fragment on the base URL is not something the agent
  // checks -- it constrains scheme, host, and port only. It is still always a
  // configuration mistake here: the value is concatenated with an API path, so
  // anything past the origin silently produces a 404 route rather than a
  // manifest.
  if (parsed.search !== "" || parsed.hash !== "") {
    throw new CatalogOriginError(
      `${CATALOG_ORIGIN_SETTING} must be an origin with no query or fragment (${value})`
    )
  }

  if (!local) {
    assertPublicHost(parsed.hostname, value)
  }

  return value.replace(/\/+$/, "")
}

/** The configured value, validated. Throws `CatalogOriginError` otherwise. */
export function requireCatalogOriginBaseUrl(): string {
  return assertCatalogOriginBaseUrl(process.env[CATALOG_ORIGIN_SETTING])
}

/**
 * `host_is_disallowed_target`, inverted. Node lowercases and IDNA-normalizes
 * `hostname` for us; the trailing dot and the IPv6 brackets it leaves alone,
 * and the agent strips both before testing, so this does too.
 */
function assertPublicHost(hostname: string, value: string) {
  const host = hostname.replace(/\.$/, "")
  const ipForm =
    host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host

  const hint = localOriginsAllowed() ? "" : LOCAL_HINT

  if (ipaddr.isValid(ipForm)) {
    throw new CatalogOriginError(
      `${CATALOG_ORIGIN_SETTING} must name a host, not an IP address; the agent rejects a bare IP as a catalog origin (${value})${hint}`
    )
  }
  if (host === "localhost" || !host.includes(".")) {
    // This is what used to make local end-to-end development impossible rather
    // than merely awkward: combined with C3 there is no host that both resolves
    // on a developer machine and passes a stock agent's checks. That is the
    // filed upstream issue. It is not relaxed here for a real origin -- only
    // `IRONHUB_ALLOW_LOCAL_ORIGINS` opens it, only outside a production build,
    // and only for a host that names this machine, which a stock agent would
    // still refuse. See lib/shared/local-origins.ts.
    throw new CatalogOriginError(
      `${CATALOG_ORIGIN_SETTING} host "${host}" has no dot; the agent rejects localhost and every dotless host as a catalog origin${hint}`
    )
  }
  const internal = INTERNAL_HOST_SUFFIXES.find((suffix) =>
    host.endsWith(suffix)
  )
  if (internal) {
    throw new CatalogOriginError(
      `${CATALOG_ORIGIN_SETTING} host "${host}" ends in "${internal}"; the agent rejects internal-network suffixes as a catalog origin${hint}`
    )
  }
}
