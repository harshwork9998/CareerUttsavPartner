import { describe, expect, it } from "vitest";

import {
  isBrowserPreviewableImage,
  MAX_UPLOAD_BYTES,
  mimeAllowedForExtension,
  PORTAL_SPEAKER_PHOTO_ACCEPT,
  PORTAL_UPLOAD_ACCEPT,
  resolvedUploadContentType,
  SPEAKER_PHOTO_UNSUPPORTED_MESSAGE,
  UNSUPPORTED_FILE_MESSAGE,
  validateUploadFile,
} from "@/lib/upload-policy";

const DOCUMENT_FILES = [
  ["logo.svg", "image/svg+xml"],
  ["logo.svg", "image/svg+xml;charset=utf-8"],
  ["mark.png", "image/png"],
  ["mark.png", "application/octet-stream"],
  ["photo.jpg", "image/jpeg"],
  ["photo.jpeg", ""],
  ["writeup.pdf", "application/pdf"],
  ["art.cdr", ""],
  ["art.cdr", "application/octet-stream"],
  ["vector.ai", "application/postscript"],
  ["vector.ai", "application/illustrator"],
  ["print.eps", "application/postscript"],
  ["print.eps", "application/x-eps"],
] as const;

describe("upload format policy", () => {
  it("accepts every advertised document extension, including generic MIME", () => {
    for (const [fileName, mimeType] of DOCUMENT_FILES) {
      expect(
        validateUploadFile({
          fileName,
          fileSizeBytes: 2048,
          mimeType,
        })
      ).toBeNull();
    }
  });

  it("keeps speaker photographs image-only", () => {
    expect(
      validateUploadFile({
        fileName: "headshot.png",
        fileSizeBytes: 2048,
        kind: "speaker_photo",
        mimeType: "image/png",
      })
    ).toBeNull();
    expect(
      validateUploadFile({
        fileName: "headshot.pdf",
        fileSizeBytes: 2048,
        kind: "speaker_photo",
        mimeType: "application/pdf",
      })
    ).toBe(SPEAKER_PHOTO_UNSUPPORTED_MESSAGE);
    expect(
      validateUploadFile({
        fileName: "headshot.cdr",
        fileSizeBytes: 2048,
        kind: "speaker_photo",
      })
    ).toBe(SPEAKER_PHOTO_UNSUPPORTED_MESSAGE);
    expect(PORTAL_SPEAKER_PHOTO_ACCEPT).toBe(".svg,.png,.jpg,.jpeg");
  });

  it("rejects unsupported extensions and empty files", () => {
    expect(
      validateUploadFile({ fileName: "notes.docx", fileSizeBytes: 12 })
    ).toBe(UNSUPPORTED_FILE_MESSAGE);
    expect(
      validateUploadFile({ fileName: "logo.png", fileSizeBytes: 0, mimeType: "image/png" })
    ).not.toBeNull();
  });

  it("keeps the 40 MB cap except for advertisement creative", () => {
    expect(
      validateUploadFile({
        fileName: "writeup.pdf",
        fileSizeBytes: MAX_UPLOAD_BYTES + 1,
      })
    ).not.toBeNull();
    expect(
      validateUploadFile({
        fileName: "ad.cdr",
        fileSizeBytes: MAX_UPLOAD_BYTES + 5_000_000,
        kind: "ad_creative",
        mimeType: "",
      })
    ).toBeNull();
  });

  it("does not reject CDR/AI/EPS because the browser MIME is empty or generic", () => {
    expect(mimeAllowedForExtension(".cdr", "")).toBe(true);
    expect(mimeAllowedForExtension(".ai", "application/octet-stream")).toBe(true);
    expect(mimeAllowedForExtension(".eps", "application/x-msdownload")).toBe(true);
    expect(resolvedUploadContentType("art.cdr", "")).toBe("application/octet-stream");
  });

  it("advertises the same accept list used by document cards", () => {
    expect(PORTAL_UPLOAD_ACCEPT).toBe(".svg,.png,.jpg,.jpeg,.pdf,.cdr,.ai,.eps");
  });

  it("only treats PNG, JPEG and SVG as browser-previewable images", () => {
    expect(isBrowserPreviewableImage("logo.png", "image/png")).toBe(true);
    expect(isBrowserPreviewableImage("logo.svg", "image/svg+xml")).toBe(true);
    expect(isBrowserPreviewableImage("writeup.pdf", "application/pdf")).toBe(false);
    expect(isBrowserPreviewableImage("art.cdr", "")).toBe(false);
    expect(isBrowserPreviewableImage("vector.ai", "application/postscript")).toBe(false);
    expect(isBrowserPreviewableImage("print.eps", "application/postscript")).toBe(false);
  });
});
