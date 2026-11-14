/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Limitation: on serverless platforms (Vercel) each instance has its own memory, so this is a
 * best-effort guard against accidental loops and casual abuse — not a hard global limit.
 * For the public pilot, also set a monthly spending limit in the OpenAI dashboard, and consider a
 * shared store (e.g. Upstash Redis) if traffic grows.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false as const, retryAfterMs: windowMs - (now - recent[0]) };
  }
  recent.push(now);
  hits.set(key, recent);
  // Keep memory bounded.
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return { ok: true as const, retryAfterMs: 0 };
}

export function resetRateLimits() {
  hits.clear();
}
