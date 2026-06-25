import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Rate limiting.
 *
 * `rateLimit` is a tiny in-memory sliding-window limiter — fine for local dev
 * and as a fallback, but per-process (ineffective on serverless). `rateLimitDb`
 * (T-09) uses a shared Postgres counter via the service-role client so the limit
 * holds across all instances; it falls back to the in-memory limiter if the RPC
 * is unavailable so traffic is never blocked on infrastructure errors.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();
const MAX_STORE_ENTRIES = 5000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  // Opportunistic cleanup so the map can't grow unbounded under high key
  // cardinality (many unique IPs / phone numbers) on a long-lived instance.
  if (store.size > MAX_STORE_ENTRIES) pruneRateLimitStore();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  bucket.count += 1;
  const allowed = bucket.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

// Opportunistic cleanup so the map doesn't grow unbounded.
export function pruneRateLimitStore(): void {
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (bucket.resetAt < now) store.delete(key);
  }
}

/**
 * Durable, multi-instance rate limit backed by Postgres (T-09). Uses the
 * `rate_limit_hit` SQL function via the service-role client. Falls back to the
 * in-memory limiter if the RPC errors, so we degrade rather than block traffic.
 */
export async function rateLimitDb(
  supabase: SupabaseClient,
  key: string,
  limit = 10,
  windowMs = 60_000,
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc("rate_limit_hit", {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });
    if (error) return rateLimit(key, limit, windowMs);
    return { allowed: Boolean(data), remaining: 0, resetAt: 0 };
  } catch {
    return rateLimit(key, limit, windowMs);
  }
}
