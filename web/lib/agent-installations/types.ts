export type AgentInstallationView = {
  id: string
  label: string
  agentUrl: string
  keyFingerprint: string
  isDefault: boolean
  verifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AgentInstallationInput = {
  label: string
  agentUrl: string
  sharedKey: string
  isDefault?: boolean
}

export type InstallIntentResponse = {
  redirectUrl: string
  message: string
  expiresAt: string
}
