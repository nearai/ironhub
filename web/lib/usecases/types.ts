export const USE_CASE_CATEGORIES = [
  "Personal assistant",
  "Web 3 / Crypto",
  "Coding / dev workflow",
  "Research",
  "Marketing / content",
  "Business ops",
  "Sales / CRM",
  "Files / knowledge",
  "Automation",
  "Design / media",
  "Skill creation",
] as const

export type UsecaseCategory = (typeof USE_CASE_CATEGORIES)[number]

export interface SkillReference {
  name: string
  url?: string
  isNew?: boolean
}

export interface UseCase {
  id: string
  title: string
  examplePrompt: string
  agentDoes: string
  categories: UsecaseCategory[]
  skillsAndTools: SkillReference[]

  sourceUrl?: string
  authorHandle?: string
}
