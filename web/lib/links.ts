const REPO = "https://github.com/nearai/ironhub"

export const links = {
  repo: REPO,
  newSkill: `${REPO}/issues/new?template=new-skill.yml`,
  newTool: `${REPO}/issues/new?template=new-tool.yml`,
  suggestFeature: `${REPO}/issues/new?template=suggest-new-feature.yml`,
  contributing: `${REPO}/blob/main/CONTRIBUTING.md`,
  tracking: `${REPO}/blob/main/tracking.md`,
  ironclaw: "https://ironclaw.com/",
  docs: "https://docs.ironclaw.com/",
  iliad: "https://iliad.codes/",
}

export function sourceLink(path: string) {
  return `${REPO}/blob/main/${path}`
}
