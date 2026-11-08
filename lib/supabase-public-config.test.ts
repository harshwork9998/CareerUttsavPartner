import { afterEach, describe, expect, it } from "vitest";

import {
  buildSupabaseStorageTusHeaders,
  isLegacySupabaseJwtApiKey,
  readSupabasePublishableKey,
} from "@/lib/supabase-public-config";

describe("supabase publishable config", () => {
  const prior: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  function snapshotEnv(keys: string[]) {
    for (const key of keys) {
      prior[key] = process.env[key];
    }
  }

  it("prefers publishable key over legacy anon", () => {
    snapshotEnv([
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJlegacy";
    expect(readSupabasePublishableKey()).toBe("sb_publishable_test");
  });

  it("does not treat sb_publishable keys as JWTs", () => {
    expect(isLegacySupabaseJwtApiKey("sb_publishable_abc")).toBe(false);
    expect(
      isLegacySupabaseJwtApiKey(
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.sig"
      )
    ).toBe(true);
  });

  it("uses apikey and x-signature only for opaque publishable keys", () => {
    const headers = buildSupabaseStorageTusHeaders({
      apiKey: "sb_publishable_test",
      uploadSignature: "signed-upload-token",
    });
    expect(headers.apikey).toBe("sb_publishable_test");
    expect(headers["x-signature"]).toBe("signed-upload-token");
    expect(headers["x-upsert"]).toBe("false");
    expect(headers.authorization).toBeUndefined();
    expect(headers.Authorization).toBeUndefined();
  });

  it("adds Bearer authorization for legacy JWT anon keys", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.testsig";
    const headers = buildSupabaseStorageTusHeaders({
      apiKey: jwt,
      uploadSignature: "signed-upload-token",
    });
    expect(headers.apikey).toBe(jwt);
    expect(headers.authorization).toBe(`Bearer ${jwt}`);
    expect(headers["x-signature"]).toBe("signed-upload-token");
  });

  it("falls back to NEXT_PUBLIC_SUPABASE_ANON_KEY", () => {
    snapshotEnv([
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJlegacy";
    expect(readSupabasePublishableKey()).toBe("eyJlegacy");
  });
});
