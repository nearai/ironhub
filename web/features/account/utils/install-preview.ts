import { createInstallPayload } from "@/lib/agent-installations/payload"

const EXAMPLE_INTENT = {
  version: "0.1.0",
  userId: "you.near",
  agentInstallationId: "agent-1",
  ts: 1716123456,
  nonce: "6f3ab2e7c9ad4b91",
  artifactDigest:
    "3bef8b777d4b0dc782fbba98c00b622da35e098642e8e103b94e395679b5499a",
}

const EXAMPLE_SIG = "7a4c1f0e9b2d8a6c5e3f0d1b2a4c6e8f"

export function getInstallPreviewName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ")
}

export function getInstallPreviewMessage(slug: string) {
  return createInstallPayload({ slug, ...EXAMPLE_INTENT })
}

export function getInstallPreviewUrl(slug: string) {
  const params = new URLSearchParams({
    slug,
    version: EXAMPLE_INTENT.version,
    uid: EXAMPLE_INTENT.userId,
    aid: EXAMPLE_INTENT.agentInstallationId,
    ts: String(EXAMPLE_INTENT.ts),
    nonce: EXAMPLE_INTENT.nonce,
    sig: EXAMPLE_SIG,
    artifact_digest: EXAMPLE_INTENT.artifactDigest,
  })
  return `https://ironclaw.agent.near.ai/#/install/${slug}?${params.toString()}`
}
