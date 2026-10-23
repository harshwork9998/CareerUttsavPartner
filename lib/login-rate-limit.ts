const WINDOW_MS = 15 * 60 * 1000;
const LIMIT = 5;

const globalStore = globalThis as unknown as {
  __cuPartnerPortalLoginFailures?: Map<string, number[]>;
};

function buckets(): Map<string, number[]> {
  if (!globalStore.__cuPartnerPortalLoginFailures) {
    globalStore.__cuPartnerPortalLoginFailures = new Map();
  }
  return globalStore.__cuPartnerPortalLoginFailures;
}

function recent(key: string, now: number): number[] {
  return (buckets().get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
}

export function loginRateLimitKey(ip: string, login: string): string {
  return `${ip.trim() || "unknown"}:${login.trim().toLowerCase()}`;
}

export function isLoginRateLimited(key: string, now = Date.now()): boolean {
  const hits = recent(key, now);
  buckets().set(key, hits);
  return hits.length >= LIMIT;
}

export function recordLoginFailure(key: string, now = Date.now()): void {
  const hits = recent(key, now);
  if (hits.length >= LIMIT) {
    buckets().set(key, hits);
    return;
  }
  hits.push(now);
  buckets().set(key, hits);
}

export function clearLoginFailures(key: string): void {
  buckets().delete(key);
}

export function resetLoginRateLimits(): void {
  buckets().clear();
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export const LOGIN_ERROR = "Invalid login or password.";
