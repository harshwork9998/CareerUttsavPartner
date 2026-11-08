import { describe, expect, it } from "vitest";

import {
  resolvePortalMediaUrlState,
  resolvePortalUploadUi,
  resolveSubmittedMediaFrame,
} from "@/lib/portal-upload-presentation";
import type { PartnerPortalDocument } from "@/lib/types";

const submitted: PartnerPortalDocument = {
  id: "logo-1",
  kind: "logo",
  label: "University logo",
  fileName: "logo.png",
  mimeType: "image/png",
  url: "",
  fileSizeBytes: 2048,
  uploadedAt: "2026-11-08T15:29:58.000Z",
  storageProvider: "supabase",
  storageBucket: "partner-portal-assets",
  storagePath: "partners/p/logo/uuid.png",
};

const legacy: PartnerPortalDocument = {
  ...submitted,
  id: "logo-legacy",
  url: "data:image/png;base64,abc",
  storageProvider: undefined,
  storageBucket: undefined,
  storagePath: undefined,
};

describe("resolvePortalUploadUi", () => {
  it("never shows an empty dropzone after a successful commit while refetch is delayed", () => {
    const ui = resolvePortalUploadUi({
      confirmedDoc: submitted,
      uploading: false,
    });
    expect(ui.showEmptyDropzone).toBe(false);
    expect(ui.phase).toBe("submitted");
    expect(ui.displayDoc?.storagePath).toBe(submitted.storagePath);
  });

  it("keeps the previous file visible while a replacement is uploading", () => {
    const previous = { ...submitted, id: "old", fileName: "old.png" };
    const ui = resolvePortalUploadUi({
      serverDoc: previous,
      uploading: true,
      saving: false,
    });
    expect(ui.showEmptyDropzone).toBe(false);
    expect(ui.phase).toBe("uploading");
    expect(ui.displayDoc?.fileName).toBe("old.png");
  });

  it("shows verifying/saving until persistence is confirmed", () => {
    expect(
      resolvePortalUploadUi({
        serverDoc: submitted,
        uploading: true,
        saving: true,
      }).phase
    ).toBe("saving");
  });

  it("shows a finalizing state when the signed read URL is still loading", () => {
    const ui = resolvePortalUploadUi({
      confirmedDoc: submitted,
      mediaResolving: true,
      mediaUrl: null,
    });
    expect(ui.phase).toBe("finalizing");
    expect(ui.showEmptyDropzone).toBe(false);
  });

  it("keeps the previous document after a failed commit", () => {
    const ui = resolvePortalUploadUi({
      serverDoc: submitted,
      failed: true,
      selectedFile: true,
    });
    expect(ui.phase).toBe("failed");
    expect(ui.displayDoc).toEqual(submitted);
    expect(ui.showEmptyDropzone).toBe(false);
  });

  it("does not treat a new selection as an empty document state", () => {
    const ui = resolvePortalUploadUi({ selectedFile: true });
    expect(ui.phase).toBe("selected");
    expect(ui.showEmptyDropzone).toBe(false);
  });

  it("still treats a legacy data URL as submitted", () => {
    const ui = resolvePortalUploadUi({ serverDoc: legacy });
    expect(ui.phase).toBe("submitted");
    expect(ui.showEmptyDropzone).toBe(false);
  });
});

describe("resolveSubmittedMediaFrame", () => {
  it("uses a loading placeholder instead of an empty dropzone while the signed URL loads", () => {
    const frame = resolveSubmittedMediaFrame({
      displayDoc: submitted,
      mediaResolving: true,
      mediaUrl: null,
    });
    expect(frame.showFrame).toBe(true);
    expect(frame.showPlaceholder).toBe(true);
    expect(frame.imageUrl).toBeNull();
  });

  it("keeps a local preview visible until the signed URL arrives", () => {
    const frame = resolveSubmittedMediaFrame({
      displayDoc: submitted,
      localPreview: "blob:logo",
      mediaResolving: true,
      mediaUrl: null,
    });
    expect(frame.imageUrl).toBe("blob:logo");
    expect(frame.showPlaceholder).toBe(false);
  });
});

describe("resolvePortalMediaUrlState", () => {
  it("does not clear the previous signed URL while a replacement URL is fetching", () => {
    expect(
      resolvePortalMediaUrlState({
        docPresent: true,
        storageBacked: true,
        legacyUrl: null,
        previousUrl: "https://signed.example/old",
      })
    ).toEqual({
      url: "https://signed.example/old",
      isResolving: true,
    });
  });

  it("returns the legacy data URL immediately", () => {
    expect(
      resolvePortalMediaUrlState({
        docPresent: true,
        storageBacked: false,
        legacyUrl: "data:image/png;base64,abc",
        previousUrl: null,
      })
    ).toEqual({
      url: "data:image/png;base64,abc",
      isResolving: false,
    });
  });
});
