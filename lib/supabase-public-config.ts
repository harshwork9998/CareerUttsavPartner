/**
 * Browser-safe Supabase key for Storage TUS (`apikey` header).
 * Prefer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (sb_publishable_…); fall back to legacy anon JWT.
 * Names must be static so Next.js can inline them into the client bundle.
 */
export function readSupabasePublishableKey(): string | null {
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (publishable) return publishable;
  const legacy = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return legacy || null;
}

/** Direct reference so a client bundle can see the project URL if it is set. */
export function readSupabasePublicUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return value || null;
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
