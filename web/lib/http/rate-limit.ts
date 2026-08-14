// Fixed-window rate limiter. In-memory by default (single-instance
// deployment), with a small store interface so it can be swapped for a
// Redis-backed implementation later without touching call sites.

export type RateLimitStore = {
  /**
   * Records one hit for `key` and returns the current count within the
   * active fixed window, plus the epoch ms when that window resets.
   */
  hit(key: string, windowMs: number, now: number): { count: number; resetAt: number }
}

type WindowEntry = { count: number; resetAt: number }

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly windows = new Map<string, WindowEntry>()

  hit(key: string, windowMs: number, now: number) {
    const existing = this.windows.get(key)

    if (!existing || existing.resetAt <= now) {
      const entry: WindowEntry = { count: 1, resetAt: now + windowMs }
      this.windows.set(key, entry)
      return entry
    }

    existing.count += 1
    return existing
  }

  /** Test/debug helper: drop all tracked windows. */
  clear() {
    this.windows.clear()
  }
}

export type RateLimitOptions = {
  /** Max requests allowed per window. */
  limit: number
  /** Fixed window size in milliseconds. */
  windowMs: number
  /** Backing store; defaults to a process-local in-memory store. */
  store?: RateLimitStore
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

export type RateLimiter = (key: string, now?: number) => RateLimitResult

/**
 * Creates a fixed-window rate limiter keyed by an arbitrary string (token,
 * IP, etc). Each call to the returned function records one hit and reports
 * whether the caller is within the configured limit.
 */
export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  const store = options.store ?? new InMemoryRateLimitStore()

  return (key: string, now: number = Date.now()): RateLimitResult => {
    const { count, resetAt } = store.hit(key, options.windowMs, now)

    if (count > options.limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000))
      return { allowed: false, retryAfterSeconds }
    }

    return { allowed: true }
  }
}

/** Builds a standard 429 response with a `Retry-After` header. */
export function rateLimitExceededResponse(retryAfterSeconds: number): Response {
  return new Response("Too many requests", {
    status: 429,
    headers: {
      "Retry-After": String(retryAfterSeconds),
      "Cache-Control": "no-store",
    },
  })
}

/** Best-effort client identity for public token routes: IP, else "unknown". */
export function resolveClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim()
  }
  return request.headers.get("x-real-ip") ?? "unknown"
}
