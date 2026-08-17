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
    const body = await response.clone().json()
    if (body && typeof body.error === "string") return body.error
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
