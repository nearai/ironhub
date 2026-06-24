import type {
  HubArtifact,
  HubManifest,
  HubSkillEntry,
  HubToolEntry,
  Provenance,
} from "@/lib/catalog/manifest-types"

import { prisma } from "../db"
import type { ContentKind } from "./content"

const PRIVATE_PROVENANCE: Provenance = "new"

function contentUrl(
  baseUrl: string,
  artifactId: string,
  kind: ContentKind,
  token: string
): string {
  return `${baseUrl}/api/private-artifacts/${artifactId}/content/${kind}?token=${encodeURIComponent(token)}`
}

export async function buildPrivateArtifactManifest(input: {
  organizationId: string
  artifactId: string
  token: string
  baseUrl: string
  generatedAt: string
}): Promise<HubManifest> {
  const artifact = await prisma.privateArtifact.findFirst({
    where: { id: input.artifactId, organizationId: input.organizationId },
    include: {
      content: { select: { kind: true, sha256: true, sizeBytes: true } },
    },
  })
  if (!artifact) {
    throw new Response("Artifact not found", { status: 404 })
  }

  const byKind = new Map(artifact.content.map((c) => [c.kind, c]))
  const hubArtifact = (kind: ContentKind): HubArtifact => {
    const content = byKind.get(kind)
    if (!content) {
      throw new Response(`Artifact is missing required content: ${kind}`, {
        status: 409,
      })
    }
    return {
      url: contentUrl(input.baseUrl, artifact.id, kind, input.token),
      size_bytes: content.sizeBytes,
      sha256: content.sha256,
    }
  }

  const tools: HubToolEntry[] = []
  const skills: HubSkillEntry[] = []

  if (artifact.type === "tool") {
    tools.push({
      name: artifact.name,
      crate_name: artifact.name,
      version: artifact.version,
      description: artifact.description ?? "",
      provenance: PRIVATE_PROVENANCE,
      wasm: hubArtifact("wasm"),
      capabilities: hubArtifact("capabilities"),
    })
  } else if (artifact.type === "skill") {
    skills.push({
      name: artifact.name,
      trunk: artifact.name,
      version: artifact.version,
      description: artifact.description ?? "",
      provenance: PRIVATE_PROVENANCE,
      skill_md: hubArtifact("skill_md"),
    })
  } else {
    throw new Response(`Unsupported artifact type: ${artifact.type}`, {
      status: 409,
    })
  }

  return {
    version: "1",
    generated_at: input.generatedAt,
    release_tag: `private-${artifact.id}`,
    repo: "ironhub-private",
    tools,
    skills,
  }
}
