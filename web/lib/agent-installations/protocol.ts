import { randomBytes, randomUUID } from "crypto"

import { signInstallPayload } from "@/lib/agent-installations/crypto"

export function createNonce() {
  return randomBytes(18).toString("base64url")
}

export function createRecordId() {
  return randomUUID()
}

export { createInstallPayload } from "@/lib/agent-installations/payload"

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
