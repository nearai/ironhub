export function createInstallPayload(input: {
  slug: string
  version: string
  userId: string
  agentInstallationId: string
  ts: number
  nonce: string
  artifactDigest: string
  privateManifestUrl?: string
}) {
  const fields = [
    input.slug,
    input.version,
    input.userId,
    input.agentInstallationId,
    String(input.ts),
    input.nonce,
    input.artifactDigest,
    input.privateManifestUrl ?? "",
  ]

  return fields.reduce(
    (payload, field) => `${payload}:${Buffer.byteLength(field, "utf8")}:${field}`,
    "install"
  )
}
