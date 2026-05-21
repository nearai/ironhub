import { headers } from "next/headers"

import { auth, type AuthSession } from "@/lib/auth/server"

export async function getAuthSession() {
  return auth.api.getSession({
    headers: await headers(),
  })
}

export async function requireAuthSession(): Promise<AuthSession> {
  const session = await getAuthSession()

  if (!session) {
    throw new Response("Unauthorized", { status: 401 })
  }

  return session
}
