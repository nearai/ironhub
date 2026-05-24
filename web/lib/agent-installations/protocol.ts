import { randomBytes, randomUUID } from "crypto"

import { signInstallPayload } from "@/lib/agent-installations/crypto"

export function createNonce() {
  return randomBytes(18).toString("base64url")
}

export function createRecordId() {
  return randomUUID()
}

export function createInstallPayload(input: {
  slug: string
  version: string
  userId: string
  agentInstallationId: string
  ts: number
  nonce: string
  artifactDigest: string
}) {
  return [
    "install",
    input.slug,
    input.version,
    input.userId,
    input.agentInstallationId,
    String(input.ts),
    input.nonce,
    input.artifactDigest,
  ].join(":")
}

export function signAgentRegistration(input: {
  sharedKey: string
  userId: string
  agentInstallationId: string
  ts: number
  nonce: string
}) {
  const payload = [
    "register",
    input.userId,
    input.agentInstallationId,
    String(input.ts),
    input.nonce,
  ].join(":")

  return {
    payload,
    sig: signInstallPayload(input.sharedKey, payload),
  }
}
