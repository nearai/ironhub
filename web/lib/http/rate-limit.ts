// Fixed-window rate limiter. In-memory by default (single-instance
// deployment), with a small store interface so it can be swapped for a
// Redis-backed implementation later without touching call sites.

export type RateLimitStore = {
  /**
   * Records one hit for `key` and returns the current count within the
   * active fixed window, plus the epoch ms when that window resets.
   */
  hit(
    key: string,
    windowMs: number,
    now: number
  ): { count: number; resetAt: number }
}

type WindowEntry = { count: number; resetAt: number }

// Hard cap on tracked keys so an unauthenticated flood of distinct keys
// (e.g. random tokens/IPs) cannot grow this map without bound. When full,
// a sweep of expired entries is forced before accepting new keys; if still
// full after sweeping, the oldest entries are evicted.
const DEFAULT_MAX_ENTRIES = 50_000

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly windows = new Map<string, WindowEntry>()
  private readonly maxEntries: number

  constructor(maxEntries: number = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries
  }

  hit(key: string, windowMs: number, now: number) {
    const existing = this.windows.get(key)

    if (existing && existing.resetAt > now) {
      existing.count += 1
      return existing
    }

    if (existing) {
      this.windows.delete(key)
    }

    if (this.windows.size >= this.maxEntries) {
      this.sweepExpired(now)
    }
    if (this.windows.size >= this.maxEntries) {
      this.evictOldest()
    }

    const entry: WindowEntry = { count: 1, resetAt: now + windowMs }
    this.windows.set(key, entry)
    return entry
  }

  /** Removes all windows that have already reset as of `now`. */
  private sweepExpired(now: number) {
    for (const [key, entry] of this.windows) {
      if (entry.resetAt <= now) {
        this.windows.delete(key)
      }
    }
  }

  /** Drops the least-recently-inserted entry (Map preserves insertion order). */
  private evictOldest() {
    const oldestKey = this.windows.keys().next().value
    if (oldestKey !== undefined) {
      this.windows.delete(oldestKey)
    }
  }

  /** Test/debug helper: drop all tracked windows. */
  clear() {
    this.windows.clear()
  }

  /** Test/debug helper: number of tracked windows. */
  size(): number {
    return this.windows.size
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

/**
 * Best-effort client identity for public token routes: IP, else "unknown".
 * Callers MUST include this in the rate-limit key (e.g. `${ip}:${token}`) —
 * the token itself is attacker-chosen, so keying on it alone lets every
 * brute-force guess start a fresh budget.
 */
export function resolveClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim()
  }
  return request.headers.get("x-real-ip") ?? "unknown"
}
