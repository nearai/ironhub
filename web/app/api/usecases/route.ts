import { NextResponse } from "next/server"
import { queryUseCases } from "@/lib/usecases/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const searchQuery = searchParams.get("searchQuery") || searchParams.get("q") || ""
  const category = searchParams.get("category") || "All"
  const pageParam = parseInt(searchParams.get("page") || "1", 10)
  const limitParam = parseInt(searchParams.get("limit") || "15", 10)
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 15
  const force = searchParams.get("force") === "true"

  try {
    const data = await queryUseCases({
      searchQuery,
      category,
      page,
      limit,
      force,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error querying use cases:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
