const CLAW_AVATAR_PATHS = [
  "/assets/agents/content-writer.png",
  "/assets/agents/custom-agent.png",
  "/assets/agents/data-analyst.png",
  "/assets/agents/developer-agent.png",
  "/assets/agents/on-chain-agent.png",
  "/assets/agents/ops-agent.png",
  "/assets/agents/personal-assistant.png",
  "/assets/agents/research-agent.png",
  "/assets/agents/security-agent.png",
  "/assets/agents/trading-agent.png",
] as const

type ClawAvatarUser = {
  id?: string | null
  email?: string | null
  name?: string | null
}

export function getUserClawAvatarPath(user: ClawAvatarUser) {
  const key = user.id ?? user.email ?? user.name ?? "ironhub-user"
  return CLAW_AVATAR_PATHS[hashString(key) % CLAW_AVATAR_PATHS.length]
}

function hashString(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}
