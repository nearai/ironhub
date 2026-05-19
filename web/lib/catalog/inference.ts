import type { CapabilityManifest } from "@/lib/catalog/source-types"

export function extractLimits(text: string) {
  const limitLines = text
    .split("\n")
    .filter((line) => /limit|cap|403|rate/i.test(line))
    .map((line) => line.replace(/^[-#*\s]+/, "").trim())

  return limitLines.slice(0, 3)
}

export function extractSkillLimits(text: string) {
  const section =
    text.split("## Do NOT Use This Skill For")[1]?.split("\n## ")[0] ?? ""
  const limits = section
    .split("\n")
    .filter((line) => line.trim().startsWith("- "))
    .map((line) => line.replace(/^-\s*/, "").trim())

  return limits.slice(0, 3)
}

export const CATEGORIES = [
  "Dev Tools",
  "Data & APIs",
  "Security",
  "Automation",
  "Communication",
  "Productivity",
  "AI & ML",
  "Web3",
] as const

export function inferCategory(slug: string, text: string) {
  const haystack = `${slug} ${text}`.toLowerCase()

  if (
    haystack.includes("polymarket") ||
    haystack.includes("near") ||
    haystack.includes("rpc") ||
    haystack.includes("contract") ||
    haystack.includes("web3") ||
    haystack.includes("crypto") ||
    haystack.includes("blockchain")
  ) {
    return "Web3"
  }

  if (
    haystack.includes("microsoft") ||
    haystack.includes("excel") ||
    haystack.includes("teams") ||
    haystack.includes("workflow")
  ) {
    return "Productivity"
  }

  return "Dev Tools"
}

export function inferToolTags(
  slug: string,
  manifest: CapabilityManifest,
  readme: string
) {
  const tags = new Set(["WASM tool"])
  const text = `${slug} ${manifest.description ?? ""} ${readme}`.toLowerCase()

  if (text.includes("oauth")) tags.add("OAuth")
  if (text.includes("microsoft")) tags.add("Microsoft Graph")
  if (text.includes("near")) tags.add("NEAR")
  if (manifest.http?.allowlist?.length) tags.add("HTTP allowlist")
  if (!manifest.secrets?.allowed_names?.length) tags.add("No required secrets")

  return Array.from(tags)
}

export function inferIcon(slug: string) {
  if (slug.includes("near")) return "near"
  if (slug.includes("microsoft")) return "microsoft"
  return "tool"
}

export function titleize(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
