import { CATEGORIES } from "@/lib/catalog/inference"

export type UsecaseCategory = typeof CATEGORIES[number]

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
