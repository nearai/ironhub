/**
 * The one switch that lets this hub talk to an agent on this machine.
 *
 * Two guards stand between a developer and a working end-to-end run, and both
 * are correct in production:
 *
 *  - `catalog-origin.ts` requires `NEXT_PUBLIC_APP_URL` to be https on a public
 *    dotted host, because a stock agent pins every artifact URL to the catalog
 *    origin and rejects anything else.
 *  - `agent-installations/validation.ts` requires a registered agent URL to be
 *    https resolving to a public unicast address, because the hub makes a
 *    server-side POST to it and an unchecked one is an SSRF primitive.
 *
 * Together they made local end-to-end testing impossible: no host both resolves
 * on a developer machine and passes both checks. The workaround was a Cloudflare
 * tunnel. This flag is the alternative -- it relaxes exactly the host and scheme
 * rules, for local addresses only, and never in a production build.
 *
 * It does NOT relax anything else: user info in a URL is still rejected, a query
 * or fragment on the base URL is still rejected, the shared-key rules are
 * untouched, and the DNS-pinning in `postAgentRegistration` still resolves once
 * and dials the resolved address, so a rebinding attack gains nothing.
 *
 * Two independent conditions must hold, so a leaked env var alone cannot open
 * this in a deployed hub:
 *
 *   1. `NODE_ENV !== "production"` -- `next build` and `next start` both set it.
 *   2. `IRONHUB_ALLOW_LOCAL_ORIGINS === "true"` -- exact string, so a stray "1"
 *      or "yes" does nothing.
 */
import ipaddr from "ipaddr.js"

export const LOCAL_ORIGINS_SETTING = "IRONHUB_ALLOW_LOCAL_ORIGINS"

/** Suffix half of the agent's own internal-host list, kept in step with it. */
const LOCAL_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".test"]

export function localOriginsAllowed(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env[LOCAL_ORIGINS_SETTING] === "true"
  )
}

/**
 * True for a host that names this machine or its private network -- the only
 * hosts the flag unlocks. A public host is never affected by it, so turning the
 * flag on cannot widen what a deployed hub would accept for a real origin.
 */
export function isLocalHost(hostname: string): boolean {
  const host = hostname.replace(/\.$/, "").toLowerCase()
  const literal =
    host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host

  // An IP literal is judged by its range, not its spelling: `127.0.0.1` and
  // `[::1]` are the addresses a local agent actually binds, and a dev stack on
  // a docker bridge lands in a private range.
  if (ipaddr.isValid(literal)) {
    return isLocalAddress(literal)
  }
  if (
    host === "localhost" ||
    LOCAL_HOST_SUFFIXES.some((s) => host.endsWith(s))
  ) {
    return true
  }
  // A dotless host is a container or LAN name (`ironhub-devstack`), which is
  // exactly the shape a dev stack uses and never a routable public name.
  return !host.includes(".")
}

/** Ranges that cannot leave this machine or its own network segment. */
const LOCAL_RANGES = new Set([
  "loopback",
  "private",
  "linkLocal",
  "uniqueLocal",
  "unspecified",
])

export function isLocalAddress(address: string): boolean {
  let parsed: ReturnType<typeof ipaddr.parse>
  try {
    parsed = ipaddr.parse(address)
  } catch {
    return false
  }
  if (parsed.kind() === "ipv6") {
    const v6 = parsed as ipaddr.IPv6
    if (v6.isIPv4MappedAddress()) {
      return LOCAL_RANGES.has(v6.toIPv4Address().range())
    }
  }
  return LOCAL_RANGES.has(parsed.range())
}

/**
 * Shouted once per process when the flag is live, so a hub that is somehow
 * running with it on says so in its own logs rather than only in its behaviour.
 */
let announced = false
export function announceLocalOrigins() {
  if (announced || !localOriginsAllowed()) {
    return
  }
  announced = true
  console.warn(
    `[${LOCAL_ORIGINS_SETTING}] local origins are ALLOWED: this hub accepts ` +
      `http and loopback/private hosts for its catalog origin and for agent ` +
      `URLs. Development only -- never set this on a deployed hub.`
  )
}
