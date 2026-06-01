import { promises as fs } from "fs"
import path from "path"
import type { UseCase, UsecaseCategory } from "./types"
import { CATEGORIES } from "@/lib/catalog/inference"

export async function getUseCases(): Promise<UseCase[]> {
  try {
    const dataPath = path.join(process.cwd(), "data", "usecases.json")
    const fileContents = await fs.readFile(dataPath, "utf8")
    const useCases = JSON.parse(fileContents) as UseCase[]
    return useCases
  } catch (error) {
    console.error("Error reading usecases.json:", error)
    return []
  }
}

export async function getUsecaseCategories() {
  return [...CATEGORIES]
}
