const PUBLISHABLE_ENV_NAMES = [
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

/**
 * Browser-safe Supabase key for Storage TUS (`apikey` header).
 * Prefer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (sb_publishable_…); fall back to legacy anon JWT.
 */
export function readSupabasePublishableKey(): string | null {
  for (const name of PUBLISHABLE_ENV_NAMES) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return null;
}

/** Legacy anon keys are JWTs; new publishable keys are opaque (`sb_publishable_…`). */
export function isLegacySupabaseJwtApiKey(key: string): boolean {
  const trimmed = key.trim();
  if (
    trimmed.startsWith("sb_publishable_") ||
    trimmed.startsWith("sb_secret_")
  ) {
    return false;
  }
  return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed);
}

/**
 * Headers for Supabase signed resumable (TUS) uploads.
 * Opaque publishable keys: `apikey` + Admin `x-signature` only (no Bearer).
 * Legacy JWT anon keys: `apikey` + `Authorization: Bearer` + `x-signature`.
 */
export function buildSupabaseStorageTusHeaders(input: {
  apiKey: string;
  uploadSignature: string;
}): Record<string, string> {
  const apiKey = input.apiKey.trim();
  const headers: Record<string, string> = {
    apikey: apiKey,
    "x-upsert": "false",
    "x-signature": input.uploadSignature,
  };
  if (isLegacySupabaseJwtApiKey(apiKey)) {
    headers.authorization = `Bearer ${apiKey}`;
  }
  return headers;
}
