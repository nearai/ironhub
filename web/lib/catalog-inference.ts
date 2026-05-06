import type { CapabilityManifest } from "@/lib/catalog-source-types"

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

export function inferValuePropFallback(description: string): string {
  let cleaned = description;

  // Action counts: e.g., "36 actions", "14 actions covering..."
  cleaned = cleaned.replace(/(action\s+counts?:\s*)?\d+\s+actions?(\s+covering)?/gi, "");

  // Activation keywords: e.g., "18 activation keywords", "6 activation patterns"
  cleaned = cleaned.replace(/(activation\s+keywords?:\s*)?\d+\s+activation\s+(keywords|patterns)(\s+for)?/gi, "");

  // Auth details: e.g., "OAuth via Microsoft Entra ID", "OAuth 2.0 user-context", "via Microsoft Entra ID"
  cleaned = cleaned.replace(/OAuth(\s+2\.0)?(\s+user-context)?/gi, "");
  cleaned = cleaned.replace(/via\s+Microsoft\s+Entra\s+ID/gi, "");

  // Technical versions: e.g., "WIT version 0.1.0", "WIT 0.1.1"
  cleaned = cleaned.replace(/(technical\s+versions?:\s*)?WIT(\s+version)?\s+\d+\.\d+\.\d+/gi, "");

  // Context tokens: e.g., "6,500 token budget", "2,000 tokens"
  cleaned = cleaned.replace(/(context\s+tokens?:\s*)?[\d,]+\s+tokens?(\s+budget)?(\s+for)?/gi, "");

  // Clean up
  cleaned = cleaned
    .replace(/\s\s+/g, " ") // double spaces
    .replace(/^\s*[\s\.,;:]+\s*/, "") // leading punctuation
    .replace(/\s*[\s\.,;:]+\s*$/, "") // trailing punctuation
    .trim();

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

export function inferValueTagsFallback(
  slug: string,
  description: string,
  tags: string[]
): string[] {
  const valueTags = new Set<string>();
  const haystack = `${slug} ${description} ${tags.join(" ")}`.toLowerCase();

  const mapping = [
    {
      keywords: ["polymarket", "near", "rpc", "orderbook", "blockchain", "crypto", "token", "price"],
      tags: ["Data Feed", "Web3"],
    },
    {
      keywords: ["workflow", "outlook", "teams", "automation", "notification", "message", "send"],
      tags: ["Automation"],
    },
    {
      keywords: ["word", "excel", "powerpoint", "generate", "document", "spreadsheet", "deck"],
      tags: ["Content Creation"],
    },
    {
      keywords: ["security", "audit", "permission", "auth", "oauth", "secret"],
      tags: ["Security"],
    },
  ];

  for (const rule of mapping) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) {
      rule.tags.forEach((tag) => valueTags.add(tag));
    }
  }

  return Array.from(valueTags);
}
