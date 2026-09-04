export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.clone().text()
    if (body) {
      try {
        const parsed = JSON.parse(body)
        if (parsed && typeof parsed.error === "string") return parsed.error
      } catch {
        // not JSON — fall through to the plain-text branch below
      }

      // Server helpers throw plain-text Responses (`throw new Response("A
      // pending invitation already exists", { status: 409 })`). Surfacing the
      // sentence they wrote beats showing the bare status text ("Conflict").
      // Guarded so an HTML error page or a long dump never reaches the user.
      const text = body.trim()
      if (text && text.length <= 300 && !text.startsWith("<")) return text
    }
  } catch {
    // fall through to status text
  }
  return response.statusText || `Request failed with status ${response.status}`
}

export async function fetchJson<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body && typeof init.body === "string"
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorMessage(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function uploadContent(
  url: string,
  bytes: Blob | ArrayBuffer
): Promise<void> {
  const response = await fetch(url, {
    method: "PUT",
    body: bytes,
  })

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorMessage(response))
  }
}
