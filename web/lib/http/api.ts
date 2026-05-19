export function jsonError(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Request failed."
  return Response.json({ error: message }, { status })
}

export function handleApiError(error: unknown) {
  if (error instanceof Response) return error
  return jsonError(error)
}

export function parseJsonObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid JSON body.")
  }

  return value as Record<string, unknown>
}

export function readString(body: Record<string, unknown>, key: string) {
  const value = body[key]

  if (typeof value !== "string") {
    throw new Error(`${key} is required.`)
  }

  return value
}

export function readOptionalString(body: Record<string, unknown>, key: string) {
  const value = body[key]
  return typeof value === "string" ? value : undefined
}

export function assertSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin")

  if (!origin) return

  const requestHost = request.headers.get("host")
  const originHost = new URL(origin).host

  if (!requestHost || originHost !== requestHost) {
    throw new Error("Cross-origin request blocked.")
  }
}

export function assertJsonRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? ""

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Content-Type must be application/json.")
  }
}

export function assertJsonMutationRequest(request: Request) {
  assertSameOriginRequest(request)
  assertJsonRequest(request)
}
