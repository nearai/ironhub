import type { LookupAddress } from "node:dns"
import { lookup } from "node:dns/promises"
import net from "node:net"

import ipaddr from "ipaddr.js"

import {
  LOCAL_ORIGINS_SETTING,
  announceLocalOrigins,
  isLocalHost,
  localOriginsAllowed,
} from "@/lib/shared/local-origins"

const SHARED_KEY_PREFIX = "ihub_sk_"
const SHARED_KEY_MIN_LENGTH = 32
const SHARED_KEY_MIN_DISTINCT = 12

export async function validateAgentUrl(value: string) {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new Error("Agent URL must be a valid URL.")
  }

  // An agent on this machine is the one case where http and a loopback address
  // are legitimate, and it is gated twice over -- see lib/shared/local-origins.
  // The address is still resolved once and pinned by the caller, so relaxing
  // the range check does not open a rebinding path.
  const local = localOriginsAllowed() && isLocalHost(url.hostname)
  if (local) {
    announceLocalOrigins()
  }

  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error(
      "Agent URL must use https." +
        (localOriginsAllowed()
          ? ""
          : ` For a local agent set ${LOCAL_ORIGINS_SETTING}=true (development builds only).`)
    )
  }

  await resolvePublicAddresses(url.hostname)

  return url.origin
}

export function validateSharedKey(value: string) {
  const sharedKey = value.trim()

  if (
    !sharedKey.startsWith(SHARED_KEY_PREFIX) ||
    sharedKey.length < SHARED_KEY_MIN_LENGTH
  ) {
    throw new Error(
      "Shared Install Key must start with ihub_sk_ and be at least 32 characters."
    )
  }

  const distinct = new Set(sharedKey.slice(SHARED_KEY_PREFIX.length)).size

  if (distinct < SHARED_KEY_MIN_DISTINCT) {
    throw new Error(
      "Shared Install Key is too low-entropy; use the generator to create a strong key."
    )
  }

  return sharedKey
}

export function validateLabel(value: string) {
  const label = value.trim()

  if (label.length < 2 || label.length > 80) {
    throw new Error("Label must be 2-80 chars.")
  }

  return label
}

export async function resolvePublicAddresses(
  hostname: string
): Promise<LookupAddress[]> {
  const literal = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname
  let addresses: LookupAddress[]

  if (net.isIP(literal) !== 0) {
    addresses = [{ address: literal, family: net.isIP(literal) }]
  } else {
    try {
      addresses = await lookup(hostname, { all: true })
    } catch {
      throw new Error("Agent URL host could not be resolved.")
    }
  }

  if (addresses.length === 0) {
    throw new Error("Agent URL host could not be resolved.")
  }

  // Resolution still happens, and the caller still dials only these addresses.
  // The flag waives the range check for a host that names this machine; every
  // other host is held to it exactly as before, including under the flag.
  const skipRangeCheck = localOriginsAllowed() && isLocalHost(hostname)

  for (const { address } of addresses) {
    if (!skipRangeCheck && !isPublicUnicast(address)) {
      throw new Error(
        "Agent URL must resolve to a public address." +
          (localOriginsAllowed()
            ? ""
            : ` For a local agent set ${LOCAL_ORIGINS_SETTING}=true (development builds only).`)
      )
    }
  }

  return addresses
}

function isPublicUnicast(address: string) {
  let parsed: ReturnType<typeof ipaddr.parse>

  try {
    parsed = ipaddr.parse(address)
  } catch {
    return false
  }

  if (parsed.kind() === "ipv6") {
    const v6 = parsed as ipaddr.IPv6

    if (v6.isIPv4MappedAddress()) {
      return v6.toIPv4Address().range() === "unicast"
    }
  }

  return parsed.range() === "unicast"
}
