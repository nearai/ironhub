export function getInstallPreviewName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ")
}

export function getInstallPreviewMessage(slug: string) {
  return `install:${slug}:1716123456:6f3ab2e7c9ad4b91`
}

export function getInstallPreviewUrl(slug: string) {
  return `https://ironclaw.agent.near.ai/#/install/${slug}?ts=1716123456&nonce=6f3ab2e7c9ad4b91&sig=7a4c...`
}
