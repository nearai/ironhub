import {
  hubArtifactUrl,
  type ArtifactRef,
  type IliadArtifactRef,
} from "@/lib/artifact-ref.server"
import type {
  HubManifest,
  HubSkillEntry,
  HubToolEntry,
  Provenance,
} from "@/lib/catalog/manifest-types"
import {
  fetchIliadPublicSkill,
  fetchIliadPublicSkillsList,
} from "@/lib/iliad/public-skills.server"
import type {
  IliadAuthorTrustTier,
  IliadPublicSkill,
} from "@/lib/iliad/public-skills-types"

const REPO = "nearai/ironhub"
const OFFICIAL_MANIFEST_URL =
  "https://github.com/nearai/ironhub/releases/latest/download/tools.json"
const ILIAD_CATEGORIES = [
  "ai-ml",
  "automation",
  "communication",
  "data-apis",
  "dev-tools",
  "productivity",
  "security",
  "web3",
]
const GITHUB_ARTIFACT_HOSTS = ["github.com", "objects.githubusercontent.com"]
const ILIAD_ARTIFACT_HOST = "fly.storage.tigris.dev"

const ILIAD_PAGE_SIZE = 100
const ILIAD_MAX_PER_CATEGORY = 5000

export class CatalogManifestError extends Error {
  constructor(
    message: string,
    readonly status = 502
  ) {
    super(message)
  }
}

type GithubArtifact = { url: string; size_bytes: number; sha256: string }
type GithubTool = {
  name: string
  crate_name?: string | null
  version: string
  description?: string | null
  wasm: GithubArtifact
  capabilities: GithubArtifact
}
type GithubSkill = {
  name: string
  trunk?: string | null
  version: string
  description?: string | null
  skill_md: GithubArtifact
}
type GithubManifest = {
  release_tag?: string
  tools?: GithubTool[]
  skills?: GithubSkill[]
}

export function decodeArtifactRef(token: string): ArtifactRef {
  let decoded: unknown
  try {
    decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8"))
  } catch {
    throw new CatalogManifestError("Invalid artifact token.", 400)
  }
  if (
    Array.isArray(decoded) &&
    decoded[0] === "g" &&
    typeof decoded[1] === "string"
  ) {
    return ["g", decoded[1]]
  }
  if (
    Array.isArray(decoded) &&
    decoded[0] === "i" &&
    decoded.length === 5 &&
    decoded.slice(1, 4).every((part) => typeof part === "string") &&
    (decoded[4] === "w" || decoded[4] === "c" || decoded[4] === "s")
  ) {
    return decoded as IliadArtifactRef
  }
  throw new CatalogManifestError("Invalid artifact token.", 400)
}

function trustTierToProvenance(
  tier: IliadAuthorTrustTier
): Provenance | null {
  switch (tier) {
    case "trusted":
      return "trusted"
    case "verified":
      return "verified"
    case "new":
      return "new"
    case "banned":
      return null
  }
}

async function fetchOfficialManifest(): Promise<{
  releaseTag: string
  tools: HubToolEntry[]
  skills: HubSkillEntry[]
}> {
  const response = await fetch(OFFICIAL_MANIFEST_URL, { cache: "no-store" })
  if (!response.ok) {
    throw new CatalogManifestError(
      `Official manifest request failed with ${response.status}.`,
      502
    )
  }
  const manifest = (await response.json()) as GithubManifest
  const tools = (manifest.tools ?? []).map((tool) => ({
    name: tool.name,
    crate_name: tool.crate_name ?? tool.name,
    version: tool.version,
    description: tool.description ?? "",
    provenance: "official" as const,
    wasm: rewriteGithubArtifact(tool.wasm),
    capabilities: rewriteGithubArtifact(tool.capabilities),
  }))
  const skills = (manifest.skills ?? []).map((skill) => ({
    name: skill.name,
    trunk: skill.trunk ?? "",
    version: skill.version,
    description: skill.description ?? "",
    provenance: "official" as const,
    skill_md: rewriteGithubArtifact(skill.skill_md),
  }))
  return { releaseTag: manifest.release_tag ?? "live", tools, skills }
}

function rewriteGithubArtifact(artifact: GithubArtifact) {
  return {
    url: hubArtifactUrl(["g", artifact.url]),
    size_bytes: artifact.size_bytes,
    sha256: artifact.sha256,
  }
}

function iliadToolEntry(skill: IliadPublicSkill): HubToolEntry | null {
  const provenance = trustTierToProvenance(skill.authorTrustTier)
  if (!provenance) {
    return null
  }
  if (!skill.capabilitiesHash || skill.capabilitiesSize === null) {
    console.error(
      `Skipping Iliad tool without capabilities hash: ${skill.userId}/${skill.name}/${skill.version}`
    )
    return null
  }
  const ref = (file: "w" | "c"): IliadArtifactRef => [
    "i",
    skill.userId,
    skill.name,
    skill.version,
    file,
  ]
  return {
    name: skill.name,
    crate_name: skill.name,
    version: skill.version,
    description: skill.description ?? "",
    provenance,
    wasm: {
      url: hubArtifactUrl(ref("w")),
      size_bytes: skill.contentSize,
      sha256: skill.contentHash,
    },
    capabilities: {
      url: hubArtifactUrl(ref("c")),
      size_bytes: skill.capabilitiesSize,
      sha256: skill.capabilitiesHash,
    },
  }
}

function iliadSkillEntry(skill: IliadPublicSkill): HubSkillEntry | null {
  const provenance = trustTierToProvenance(skill.authorTrustTier)
  if (!provenance) {
    return null
  }
  return {
    name: skill.name,
    trunk: "",
    version: skill.version,
    description: skill.description ?? "",
    provenance,
    skill_md: {
      url: hubArtifactUrl(["i", skill.userId, skill.name, skill.version, "s"]),
      size_bytes: skill.contentSize,
      sha256: skill.contentHash,
    },
  }
}

async function fetchCategorySkills(
  category: string
): Promise<IliadPublicSkill[]> {
  const collected: IliadPublicSkill[] = []
  let offset = 0
  for (;;) {
    const list = await fetchIliadPublicSkillsList({
      category,
      limit: ILIAD_PAGE_SIZE,
      offset,
    })
    collected.push(...list.skills)
    offset += list.skills.length
    if (
      list.skills.length === 0 ||
      offset >= list.total ||
      offset >= ILIAD_MAX_PER_CATEGORY
    ) {
      break
    }
  }
  return collected
}

async function fetchCommunitySkills(): Promise<IliadPublicSkill[]> {
  const lists = await Promise.all(
    ILIAD_CATEGORIES.map(async (category) => {
      try {
        return await fetchCategorySkills(category)
      } catch (error) {
        console.error(`Failed to fetch Iliad category ${category}`, error)
        return []
      }
    })
  )
  const unique = new Map<string, IliadPublicSkill>()
  for (const skill of lists.flat()) {
    unique.set(`${skill.userId}/${skill.name}/${skill.version}`, skill)
  }
  return Array.from(unique.values())
}

export async function buildUnifiedManifest(): Promise<HubManifest> {
  const official = await fetchOfficialManifest()
  const community = await fetchCommunitySkills()

  const tools = [...official.tools]
  const skills = [...official.skills]
  const officialToolNames = new Set(tools.map((tool) => tool.name))
  const officialSkillNames = new Set(skills.map((skill) => skill.name))

  for (const skill of community) {
    if (skill.kind === "tool") {
      if (officialToolNames.has(skill.name)) {
        continue
      }
      const entry = iliadToolEntry(skill)
      if (entry) {
        tools.push(entry)
      }
    } else if (skill.kind === "skill") {
      if (officialSkillNames.has(skill.name)) {
        continue
      }
      const entry = iliadSkillEntry(skill)
      if (entry) {
        skills.push(entry)
      }
    }
  }

  return {
    version: "1",
    generated_at: new Date().toISOString(),
    release_tag: official.releaseTag,
    repo: REPO,
    tools,
    skills,
  }
}

function artifactHostAllowed(origin: "g" | "i", host: string) {
  if (origin === "g") {
    return (
      GITHUB_ARTIFACT_HOSTS.includes(host) ||
      host.endsWith(".githubusercontent.com")
    )
  }
  return host === ILIAD_ARTIFACT_HOST
}

function assertAllowedUrl(origin: "g" | "i", rawUrl: string) {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new CatalogManifestError("Invalid upstream artifact URL.", 502)
  }
  if (
    parsed.protocol !== "https:" ||
    !artifactHostAllowed(origin, parsed.host)
  ) {
    throw new CatalogManifestError("Upstream artifact host not allowed.", 502)
  }
  return parsed.toString()
}

export async function resolveArtifactUpstreamUrl(
  ref: ArtifactRef
): Promise<string> {
  if (ref[0] === "g") {
    return assertAllowedUrl("g", ref[1])
  }

  const [, userId, name, version, file] = ref
  const skill = await fetchIliadPublicSkill(userId, name, version)
  const upstream = file === "c" ? skill.capabilitiesUrl : skill.downloadUrl
  if (!upstream) {
    throw new CatalogManifestError("Artifact not available.", 404)
  }
  return assertAllowedUrl("i", upstream)
}
