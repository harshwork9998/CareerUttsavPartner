import { describe, expect, it } from "vitest";

import {
  isLoginRateLimited,
  recordLoginFailure,
  resetLoginRateLimits,
} from "@/lib/login-rate-limit";
import {
  partnerSessionIsActive,
  temporaryPasswordChangeRequired,
} from "@/lib/session-policy";

describe("partner session policy", () => {
  it("requires a password change until portalPasswordChangedAt is set", () => {
    expect(temporaryPasswordChangeRequired(undefined)).toBe(true);
    expect(temporaryPasswordChangeRequired(null)).toBe(true);
    expect(temporaryPasswordChangeRequired("2026-08-01T00:00:00.000Z")).toBe(false);
  });

  it("rejects disabled access and stale auth versions", () => {
    expect(
      partnerSessionIsActive({
        portalAccessEnabled: false,
        portalAuthVersion: 2,
        portalLogin: "dean@example.edu",
        sessionAuthVersion: 2,
        sessionLogin: "dean@example.edu",
      })
    ).toBe(false);
    expect(
      partnerSessionIsActive({
        portalAccessEnabled: true,
        portalAuthVersion: 3,
        portalLogin: "dean@example.edu",
        sessionAuthVersion: 2,
        sessionLogin: "dean@example.edu",
      })
    ).toBe(false);
    expect(
      partnerSessionIsActive({
        portalAccessEnabled: true,
        portalAuthVersion: 3,
        portalLogin: "dean@example.edu",
        sessionAuthVersion: 3,
        sessionLogin: "Dean@Example.edu",
      })
    ).toBe(true);
  });
});

describe("partner login rate limit", () => {
  it("allows five failures and blocks the next within the window", () => {
    resetLoginRateLimits();
    const key = "198.51.100.8:dean@example.edu";
    const start = 1_700_000_000_000;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(isLoginRateLimited(key, start)).toBe(false);
      recordLoginFailure(key, start);
    }
    expect(isLoginRateLimited(key, start + 1000)).toBe(true);
    expect(isLoginRateLimited(key, start + 15 * 60 * 1000 + 1)).toBe(false);
  });
});
