import { lookup } from "node:dns/promises"
import net from "node:net"

import ipaddr from "ipaddr.js"

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

  if (url.protocol !== "https:") {
    throw new Error("Agent URL must use https.")
  }

  await assertPublicHost(url.hostname)

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

async function assertPublicHost(hostname: string) {
  const literal = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname
  let addresses: string[]

  if (net.isIP(literal) !== 0) {
    addresses = [literal]
  } else {
    try {
      const resolved = await lookup(hostname, { all: true })
      addresses = resolved.map((entry) => entry.address)
    } catch {
      throw new Error("Agent URL host could not be resolved.")
    }
  }

  if (addresses.length === 0) {
    throw new Error("Agent URL host could not be resolved.")
  }

  for (const address of addresses) {
    if (!isPublicUnicast(address)) {
      throw new Error("Agent URL must resolve to a public address.")
    }
  }
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
