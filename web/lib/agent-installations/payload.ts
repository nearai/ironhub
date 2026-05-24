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
