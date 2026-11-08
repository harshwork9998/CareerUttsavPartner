import type { PartnerPortalDocumentKind } from "@/lib/types";

export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

export const PORTAL_UPLOAD_ACCEPT =
  ".svg,.png,.jpg,.jpeg,.pdf,.cdr,.ai,.eps";

export const AD_CREATIVE_UNSUPPORTED_MESSAGE =
  "Please upload SVG, PNG, JPG, PDF, CDR, AI or EPS.";

export const UNSUPPORTED_FILE_MESSAGE = AD_CREATIVE_UNSUPPORTED_MESSAGE;

export const OVERSIZE_FILE_MESSAGE = "File size exceeds the 40 MB limit.";

export const PORTAL_STORAGE_SIZE_MESSAGE =
  "This file exceeds the current storage upload limit. Please contact the Career Uttsav team.";

export const PORTAL_ZERO_BYTE_MESSAGE = "The selected file is empty.";

export const UPLOAD_INTERRUPTED_MESSAGE = "Upload interrupted. Retrying…";

export const UPLOAD_FAILED_MESSAGE =
  "Upload could not be completed. Please check your connection and try again.";

export const UPLOAD_SESSION_EXPIRED_MESSAGE =
  "Upload session expired. Please try again.";

const ALLOWED_EXTENSIONS = new Set([
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".pdf",
  ".cdr",
  ".ai",
  ".eps",
]);

const STRICT_MIME_BY_EXT: Record<string, Set<string>> = {
  ".svg": new Set(["image/svg+xml"]),
  ".png": new Set(["image/png"]),
  ".jpg": new Set(["image/jpeg", "image/jpg"]),
  ".jpeg": new Set(["image/jpeg", "image/jpg"]),
  ".pdf": new Set(["application/pdf"]),
};

export function fileExtension(fileName: string): string {
  const base = fileName.trim().split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot).toLowerCase();
}

export type PortalUploadKindPolicy = "default" | "ad_creative";

export function validateUploadFile(input: {
  fileName: string;
  fileSizeBytes: number;
  kind?: PortalUploadKindPolicy;
  mimeType?: string;
}): string | null {
  const extension = fileExtension(input.fileName);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return AD_CREATIVE_UNSUPPORTED_MESSAGE;
  }
  if (
    !Number.isFinite(input.fileSizeBytes) ||
    input.fileSizeBytes < 0 ||
    input.fileSizeBytes === 0
  ) {
    return PORTAL_ZERO_BYTE_MESSAGE;
  }
  const kind = input.kind ?? "default";
  if (kind !== "ad_creative" && input.fileSizeBytes > MAX_UPLOAD_BYTES) {
    return OVERSIZE_FILE_MESSAGE;
  }

  const mime = input.mimeType?.trim().toLowerCase() ?? "";
  const allowedMimes = STRICT_MIME_BY_EXT[extension];
  if (mime && allowedMimes && !allowedMimes.has(mime)) {
    return AD_CREATIVE_UNSUPPORTED_MESSAGE;
  }

  return null;
}

export function dataUrlByteLength(url: string): number | null {
  const marker = ";base64,";
  const index = url.indexOf(marker);
  if (!url.startsWith("data:") || index === -1) return null;
  const payload = url.slice(index + marker.length).replace(/\s/g, "");
  if (!payload) return 0;
  const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

export function validateStoredUpload(input: {
  fileName: string;
  fileSizeBytes: number;
  url?: string;
  kind?: PartnerPortalDocumentKind;
  storagePath?: string;
}): string | null {
  const storageBacked = Boolean(input.storagePath?.trim());
  const policy: PortalUploadKindPolicy =
    input.kind === "ad_creative" ? "ad_creative" : "default";
  if (storageBacked && (!Number.isFinite(input.fileSizeBytes) || input.fileSizeBytes <= 0)) {
    return PORTAL_ZERO_BYTE_MESSAGE;
  }

  const fileError = validateUploadFile({
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes,
    kind: policy,
  });
  if (fileError) return fileError;

  if (typeof input.url === "string" && input.url.startsWith("data:")) {
    const decoded = dataUrlByteLength(input.url);
    if (decoded !== null && decoded === 0) {
      return PORTAL_ZERO_BYTE_MESSAGE;
    }
    if (
      policy !== "ad_creative" &&
      decoded !== null &&
      decoded > MAX_UPLOAD_BYTES
    ) {
      return OVERSIZE_FILE_MESSAGE;
    }
  }
  return null;
}

export function formatUploadBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
