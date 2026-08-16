import type { Env } from "../env";

// Fallback used when no KV namespace is bound (e.g. local `wrangler dev`
// without --kv, or a deployment that skipped the optional STATS_CACHE
// binding). It only lives for the lifetime of one Worker isolate, so on
// Cloudflare's edge it will NOT be shared across every request the way KV
// is — configure STATS_CACHE in wrangler.toml for real caching in production.
const memoryCache = new Map<string, { value: unknown; expiresAt: number }>();

export async function getCached<T>(env: Env, key: string): Promise<T | null> {
  if (env.STATS_CACHE) {
    const raw = await env.STATS_CACHE.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  const entry = memoryCache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function setCached<T>(env: Env, key: string, value: T, ttlSeconds: number): Promise<void> {
  if (env.STATS_CACHE) {
    await env.STATS_CACHE.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
    return;
  }

  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}
