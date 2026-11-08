import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MAX_UPLOAD_BYTES, validateUploadFile } from "@/lib/upload-policy";

describe("advertisement creative upload", () => {
  it("does not use readAsDataUrl for ad_creative in dashboard", () => {
    const dashboard = readFileSync(
      join(process.cwd(), "features/dashboard/dashboard-view.tsx"),
      "utf8"
    );
    const submissions = readFileSync(
      join(process.cwd(), "features/dashboard/submissions-section.tsx"),
      "utf8"
    );
    const adCard = readFileSync(
      join(process.cwd(), "features/dashboard/ad-creative-upload-card.tsx"),
      "utf8"
    );
    expect(adCard).not.toContain("readAsDataURL");
    expect(adCard).not.toContain("readFileAsDataUrl");
    expect(adCard).toContain("uploadAdCreativeWithStorage");
    expect(submissions).toContain("AdCreativeUploadCard");
    expect(dashboard).toContain("onAdCreativeCommitted");
  });

  it("blocks legacy upload_document for ad_creative", () => {
    const route = readFileSync(
      join(process.cwd(), "app/api/partner/route.ts"),
      "utf8"
    );
    expect(route).toContain('body.kind === "ad_creative"');
    expect(route).toContain("Use the advertisement creative uploader");
  });

  it("does not apply 40 MB limit for ad_creative validation", () => {
    expect(
      validateUploadFile({
        fileName: "huge.pdf",
        fileSizeBytes: MAX_UPLOAD_BYTES + 5_000_000,
        kind: "ad_creative",
      })
    ).toBeNull();
  });

  it("keeps 40 MB policy for other uploads", () => {
    expect(
      validateUploadFile({
        fileName: "writeup.pdf",
        fileSizeBytes: MAX_UPLOAD_BYTES + 1,
      })
    ).not.toBeNull();
  });

  it("does not expose service role key in admin-api", () => {
    const adminApi = readFileSync(join(process.cwd(), "lib/admin-api.ts"), "utf8");
    expect(adminApi).not.toContain("SUPABASE_SECRET_KEY");
    expect(adminApi).not.toContain("sb_secret");
    const upload = readFileSync(join(process.cwd(), "lib/ad-creative-upload.ts"), "utf8");
    expect(upload).toContain("buildSupabaseStorageTusHeaders");
    expect(upload).not.toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(upload).not.toMatch(/Bearer \$\{publishableKey\}/);
  });
});
