import { auth } from "@/lib/auth/server"
import { toNextJsHandler } from "better-auth/next-js"

const handlers = toNextJsHandler(auth)

export const GET = handlers.GET

export const POST = handlers.POST
