import { lookup } from "node:dns/promises"
import net from "node:net"

export async function validateAgentUrl(value: string) {
  const url = new URL(value)
  return url.origin
}

export function validateSharedKey(value: string) {
  const sharedKey = value.trim()

  if (!sharedKey.startsWith("ihub_sk_") || sharedKey.length < 32) {
    throw new Error("Shared Install Key must start with ihub_sk_.")
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

async function resolveHostAddresses(hostname: string) {
  if (net.isIP(hostname) !== 0) {
    return [{ address: hostname }]
  }

  return lookup(hostname, { all: true, verbatim: false })
}
