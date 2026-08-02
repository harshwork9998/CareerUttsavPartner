type RateBucket = number[];

const globalStore = globalThis as unknown as {
  __cuRateLimit?: Map<string, RateBucket>;
};

function buckets() {
  if (!globalStore.__cuRateLimit) {
    globalStore.__cuRateLimit = new Map();
  }
  return globalStore.__cuRateLimit;
}

/**
 * Returns true when the request is allowed.
 * Default: 5 attempts per key within a 15-minute window.
 */
export function allowRequest(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const store = buckets();
  const recent = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    store.set(key, recent);
    return false;
  }
  recent.push(now);
  store.set(key, recent);
  return true;
}

export function clientKey(request: Request, email?: string) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const normalized = (email ?? "").trim().toLowerCase();
  return `${ip}:${normalized}`;
}
