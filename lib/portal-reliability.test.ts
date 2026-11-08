import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("partner portal reliability", () => {
  const route = readFileSync(join(process.cwd(), "app/api/partner/route.ts"), "utf8");
  const dashboard = readFileSync(
    join(process.cwd(), "features/dashboard/dashboard-view.tsx"),
    "utf8"
  );
  const speakers = readFileSync(
    join(process.cwd(), "features/dashboard/submissions-section.tsx"),
    "utf8"
  );
  const session = readFileSync(join(process.cwd(), "lib/session.ts"), "utf8");

  it("returns 503 without clearing the cookie when Admin is unavailable", () => {
    expect(session).toContain('status: 503');
    expect(session).toContain("x-cu-auth");
    expect(session).toContain('status === "unavailable"');
  });

  it("does not clear the cookie for a stale in-flight session", () => {
    const staleBranch = session.slice(
      session.indexOf('if (status === "stale")'),
      session.indexOf("return withoutSession")
    );
    expect(staleBranch).toContain("x-cu-auth");
    expect(staleBranch).not.toContain("withoutSession");
    expect(dashboard).toContain('error?.message === "stale"');
    expect(dashboard).toContain('error?.message !== "unauthorized"');
  });

  it("does not report success when Admin submission persistence fails", () => {
    expect(route).toContain("postAdminPortalSubmission");
    expect(route).toContain("if (!saved.ok)");
    expect(route).not.toContain("syncPartnerPortalToAdmin");
  });

  it("keeps unsaved speaker drafts when server props refresh", () => {
    expect(speakers).toContain("if (draftLocked) return");
    expect(speakers).toContain("setDraftLocked(false)");
  });

  it("still blocks base64 advertisement creative uploads", () => {
    expect(route).toContain('body.kind === "ad_creative"');
  });
});