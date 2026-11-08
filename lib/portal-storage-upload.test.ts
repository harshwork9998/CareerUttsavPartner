import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PORTAL_ZERO_BYTE_MESSAGE, validateUploadFile } from "@/lib/upload-policy";
import { speakerHasPersistedPhoto } from "@/lib/partner-portal-speaker";

describe("partner portal storage migration", () => {
  it("does not convert logo, write-up, or speaker photos to data URLs", () => {
    const dashboard = readFileSync(
      join(process.cwd(), "features/dashboard/dashboard-view.tsx"),
      "utf8"
    );
    const hero = readFileSync(
      join(process.cwd(), "features/dashboard/hero-section.tsx"),
      "utf8"
    );
    const submissions = readFileSync(
      join(process.cwd(), "features/dashboard/submissions-section.tsx"),
      "utf8"
    );
    const route = readFileSync(join(process.cwd(), "app/api/partner/route.ts"), "utf8");
    expect(dashboard).toContain("applyCommittedPartnerToDashboard");
    expect(dashboard).toContain("mergeDashboardPayload");
    expect(dashboard).toContain("placeholderData");
    expect(dashboard).not.toContain("if (isError || !data)");
    expect(dashboard).not.toContain("readFileAsDataUrl");
    expect(hero).not.toContain("readFileAsDataUrl");
    expect(hero).toContain("uploadPortalDocumentWithStorage");
    expect(submissions).not.toContain("readFileAsDataUrl");
    expect(submissions).toContain("uploadSpeakerPhotoWithStorage");
    expect(submissions).toContain("PortalStorageUploadCard");
    expect(route).toContain('body.kind === "logo"');
    expect(route).toContain('body.kind === "souvenir_writeup"');
    expect(route).toContain("Use the storage uploader.");
  });

  it("keeps TUS progress callbacks and signed-endpoint usage", () => {
    const upload = readFileSync(
      join(process.cwd(), "lib/portal-storage-upload.ts"),
      "utf8"
    );
    expect(upload).toContain("endpoint: input.intent.tusEndpoint");
    expect(upload).toContain("buildSupabaseStorageTusHeaders");
    expect(upload).toContain("onProgress(bytesUploaded, bytesTotal)");
    expect(upload).not.toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(upload).not.toMatch(/Bearer \$\{publishableKey\}/);
    expect(upload).not.toContain("sb_secret");
    expect(upload).not.toContain("SUPABASE_SECRET_KEY");
    expect(upload).toContain("ifMatchToken");
    expect(upload).toContain("resolvedUploadContentType");
  });

  it("rejects empty files before upload", () => {
    expect(
      validateUploadFile({
        fileName: "logo.png",
        fileSizeBytes: 0,
        mimeType: "image/png",
      })
    ).toBe(PORTAL_ZERO_BYTE_MESSAGE);
  });

  it("treats a Storage-backed speaker photo as present without a data URL", () => {
    expect(
      speakerHasPersistedPhoto({
        photoUrl: "",
        photoStorageProvider: "supabase",
        photoStorageBucket: "partner-portal-assets",
        photoStoragePath: "partners/p/speaker_photo/s/x.png",
      })
    ).toBe(true);
    expect(speakerHasPersistedPhoto({ photoUrl: "data:image/png;base64,abc" })).toBe(true);
    expect(speakerHasPersistedPhoto({ photoUrl: "" })).toBe(false);
  });

  it("does not send speaker photos through dummy zero-byte validation", () => {
    const route = readFileSync(join(process.cwd(), "app/api/partner/route.ts"), "utf8");
    expect(route).not.toContain('fileName: "speaker-photo.png"');
    expect(route).not.toContain("url: speaker.photoUrl");
    expect(route).toContain("speakerHasPersistedPhoto");
  });

  it("does not proxy file binaries through Partner upload-intent routes", () => {
    const logoIntent = readFileSync(
      join(process.cwd(), "app/api/partner/portal-documents/[kind]/upload-intent/route.ts"),
      "utf8"
    );
    const speakerIntent = readFileSync(
      join(process.cwd(), "app/api/partner/speaker-photo/upload-intent/route.ts"),
      "utf8"
    );
    expect(logoIntent).not.toContain("readFileAsDataUrl");
    expect(logoIntent).toContain("fileName");
    expect(speakerIntent).toContain("fileName");
    expect(speakerIntent).not.toContain("base64");
  });
});
