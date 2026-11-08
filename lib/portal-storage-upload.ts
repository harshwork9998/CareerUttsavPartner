import * as tus from "tus-js-client";

import { mapAdminPartnerToPortal } from "@/lib/admin-api";
import {
  PORTAL_STORAGE_SIZE_MESSAGE,
  resolvedUploadContentType,
  UPLOAD_FAILED_MESSAGE,
  UPLOAD_SESSION_EXPIRED_MESSAGE,
  validateUploadFile,
  type PortalUploadKindPolicy,
} from "@/lib/upload-policy";
import { speakerPhotoCommitIfMatchToken } from "@/lib/partner-portal-speaker";
import {
  buildSupabaseStorageTusHeaders,
  readSupabasePublishableKey,
} from "@/lib/supabase-public-config";
import type { Partner, PartnerPortalDocumentKind } from "@/lib/types";

export type PortalSignedUploadIntent = {
  bucket: string;
  path: string;
  token: string;
  tusEndpoint: string;
  speakerId?: string;
};

export type PortalStorageDocumentKind = "logo" | "souvenir_writeup" | "ad_creative";

function mapTusError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("expired") || lower.includes("signature")) {
    return UPLOAD_SESSION_EXPIRED_MESSAGE;
  }
  if (
    lower.includes("too large") ||
    lower.includes("entity too large") ||
    lower.includes("maximum")
  ) {
    return PORTAL_STORAGE_SIZE_MESSAGE;
  }
  return UPLOAD_FAILED_MESSAGE;
}

export async function tusUploadToPortalStorage(input: {
  file: File;
  intent: PortalSignedUploadIntent;
  onProgress: (percent: number) => void;
  onRetry?: () => void;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const publishableKey = readSupabasePublishableKey();
  if (!publishableKey) {
    return { ok: false, error: UPLOAD_FAILED_MESSAGE };
  }

  return new Promise((resolve) => {
    const upload = new tus.Upload(input.file, {
      endpoint: input.intent.tusEndpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      chunkSize: 6 * 1024 * 1024,
      removeFingerprintOnSuccess: true,
      uploadDataDuringCreation: true,
      headers: buildSupabaseStorageTusHeaders({
        apiKey: publishableKey,
        uploadSignature: input.intent.token,
      }),
      metadata: {
        bucketName: input.intent.bucket,
        objectName: input.intent.path,
        contentType: resolvedUploadContentType(input.file.name, input.file.type),
        cacheControl: "3600",
      },
      onShouldRetry(error) {
        const status = (error as { originalResponse?: { getStatus?: () => number } })
          .originalResponse?.getStatus?.();
        if (status === 403 || status === 404) return false;
        input.onRetry?.();
        return true;
      },
      onError(error) {
        resolve({ ok: false, error: mapTusError(error.message) });
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (bytesTotal > 0) {
          input.onProgress(Math.min(100, Math.round((bytesUploaded / bytesTotal) * 100)));
        }
      },
      onSuccess() {
        input.onProgress(100);
        resolve({ ok: true });
      },
    });
    upload.start();
  });
}

async function postJson<T>(url: string, body: unknown): Promise<
  { ok: true; payload: T } | { ok: false; error: string; payload?: T }
> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) {
    return {
      ok: false,
      error: payload?.error ?? UPLOAD_FAILED_MESSAGE,
      payload: payload as T | undefined,
    };
  }
  return { ok: true, payload: payload as T };
}

export async function requestPortalDocumentUploadIntent(input: {
  kind: PortalStorageDocumentKind;
  file: File;
}): Promise<
  | { ok: true; intent: PortalSignedUploadIntent }
  | { ok: false; error: string }
> {
  const policy: PortalUploadKindPolicy =
    input.kind === "ad_creative" ? "ad_creative" : "default";
  const validation = validateUploadFile({
    fileName: input.file.name,
    fileSizeBytes: input.file.size,
    kind: policy,
    mimeType: input.file.type,
  });
  if (validation) return { ok: false, error: validation };

  const path =
    input.kind === "ad_creative"
      ? "/api/partner/ad-creative/upload-intent"
      : `/api/partner/portal-documents/${encodeURIComponent(input.kind)}/upload-intent`;
  const result = await postJson<PortalSignedUploadIntent>(path, {
    fileName: input.file.name,
    mimeType: resolvedUploadContentType(input.file.name, input.file.type),
    fileSizeBytes: input.file.size,
  });
  if (!result.ok) return result;
  const intent = result.payload;
  if (!intent?.bucket || !intent.path || !intent.token || !intent.tusEndpoint) {
    return { ok: false, error: UPLOAD_FAILED_MESSAGE };
  }
  return { ok: true, intent };
}

export async function commitPortalDocumentUpload(input: {
  kind: PortalStorageDocumentKind;
  file: File;
  intent: PortalSignedUploadIntent;
  label: string;
  ifMatchToken?: string;
}): Promise<
  | { ok: true; partner: Partner }
  | { ok: false; error: string; partner?: Partner }
> {
  const path =
    input.kind === "ad_creative"
      ? "/api/partner/ad-creative/commit"
      : `/api/partner/portal-documents/${encodeURIComponent(input.kind)}/commit`;
  const result = await postJson<Record<string, unknown>>(path, {
    label: input.label,
    fileName: input.file.name,
    mimeType: resolvedUploadContentType(input.file.name, input.file.type),
    fileSizeBytes: input.file.size,
    storageBucket: input.intent.bucket,
    storagePath: input.intent.path,
    ifMatchToken: input.ifMatchToken,
  });
  const partner = mapAdminPartnerToPortal(result.payload ?? {});
  if (!result.ok) {
    return { ok: false, error: result.error, partner: partner ?? undefined };
  }
  if (!partner) return { ok: false, error: UPLOAD_FAILED_MESSAGE };
  return { ok: true, partner };
}

export async function uploadPortalDocumentWithStorage(input: {
  kind: PortalStorageDocumentKind;
  file: File;
  label: string;
  onProgress: (percent: number) => void;
  onRetry?: () => void;
  ifMatchToken?: string;
}): Promise<
  | { ok: true; partner: Partner }
  | { ok: false; error: string; partner?: Partner }
> {
  const intentResult = await requestPortalDocumentUploadIntent({
    kind: input.kind,
    file: input.file,
  });
  if (!intentResult.ok) return intentResult;

  const tusResult = await tusUploadToPortalStorage({
    file: input.file,
    intent: intentResult.intent,
    onProgress: input.onProgress,
    onRetry: input.onRetry,
  });
  if (!tusResult.ok) return tusResult;

  return commitPortalDocumentUpload({
    kind: input.kind,
    file: input.file,
    intent: intentResult.intent,
    label: input.label,
    ifMatchToken: input.ifMatchToken,
  });
}

export async function requestSpeakerPhotoUploadIntent(input: {
  file: File;
  eventId: string;
  seminarId: string;
  speakerId?: string;
}): Promise<
  | { ok: true; intent: PortalSignedUploadIntent; speakerId: string }
  | { ok: false; error: string }
> {
  const validation = validateUploadFile({
    fileName: input.file.name,
    fileSizeBytes: input.file.size,
    kind: "speaker_photo",
    mimeType: input.file.type,
  });
  if (validation) return { ok: false, error: validation };

  const result = await postJson<PortalSignedUploadIntent & { speakerId?: string }>(
    "/api/partner/speaker-photo/upload-intent",
    {
      fileName: input.file.name,
      mimeType: resolvedUploadContentType(input.file.name, input.file.type),
      fileSizeBytes: input.file.size,
      eventId: input.eventId,
      seminarId: input.seminarId,
      speakerId: input.speakerId,
    }
  );
  if (!result.ok) return result;
  if (
    !result.payload?.bucket ||
    !result.payload.path ||
    !result.payload.token ||
    !result.payload.tusEndpoint ||
    !result.payload.speakerId
  ) {
    return { ok: false, error: UPLOAD_FAILED_MESSAGE };
  }
  return { ok: true, intent: result.payload, speakerId: result.payload.speakerId };
}

export async function commitSpeakerPhotoUpload(input: {
  file: File;
  intent: PortalSignedUploadIntent;
  eventId: string;
  seminarId: string;
  speakerId: string;
  ifMatchToken?: string;
}): Promise<
  | {
      ok: true;
      persisted: boolean;
      speakerId: string;
      storageBucket: string;
      storagePath: string;
      mimeType: string;
      fileSizeBytes: number;
      fileName: string;
      partner?: Partner;
    }
  | { ok: false; error: string; partner?: Partner }
> {
  const result = await postJson<{
    persisted?: boolean;
    speakerId?: string;
    storageBucket?: string;
    storagePath?: string;
    mimeType?: string;
    fileSizeBytes?: number;
    fileName?: string;
  } & Record<string, unknown>>("/api/partner/speaker-photo/commit", {
    eventId: input.eventId,
    seminarId: input.seminarId,
    speakerId: input.speakerId,
    fileName: input.file.name,
    mimeType: resolvedUploadContentType(input.file.name, input.file.type),
    fileSizeBytes: input.file.size,
    storageBucket: input.intent.bucket,
    storagePath: input.intent.path,
    ifMatchToken: input.ifMatchToken,
  });
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      partner: mapAdminPartnerToPortal(result.payload ?? {}) ?? undefined,
    };
  }
  if (!result.payload.speakerId || !result.payload.storageBucket || !result.payload.storagePath) {
    return { ok: false, error: UPLOAD_FAILED_MESSAGE };
  }
  const partner = mapAdminPartnerToPortal(result.payload);
  return {
    ok: true,
    persisted: result.payload.persisted === true,
    speakerId: result.payload.speakerId,
    storageBucket: result.payload.storageBucket,
    storagePath: result.payload.storagePath,
    mimeType: result.payload.mimeType || input.file.type,
    fileSizeBytes: Number(result.payload.fileSizeBytes) || input.file.size,
    fileName: result.payload.fileName || input.file.name,
    partner: partner ?? undefined,
  };
}

export async function uploadSpeakerPhotoWithStorage(input: {
  file: File;
  eventId: string;
  seminarId: string;
  speakerId?: string;
  onProgress: (percent: number) => void;
  onRetry?: () => void;
  ifMatchToken?: string;
  resolveIfMatchToken?: () => string | undefined;
}): Promise<
  | {
      ok: true;
      persisted: boolean;
      speakerId: string;
      storageBucket: string;
      storagePath: string;
      mimeType: string;
      fileSizeBytes: number;
      fileName: string;
      partner?: Partner;
    }
  | { ok: false; error: string; partner?: Partner }
> {
  const intentResult = await requestSpeakerPhotoUploadIntent({
    file: input.file,
    eventId: input.eventId,
    seminarId: input.seminarId,
    speakerId: input.speakerId,
  });
  if (!intentResult.ok) return intentResult;

  const tusResult = await tusUploadToPortalStorage({
    file: input.file,
    intent: intentResult.intent,
    onProgress: input.onProgress,
    onRetry: input.onRetry,
  });
  if (!tusResult.ok) return tusResult;

  return commitSpeakerPhotoUpload({
    file: input.file,
    intent: intentResult.intent,
    eventId: input.eventId,
    seminarId: input.seminarId,
    speakerId: intentResult.speakerId,
    ifMatchToken: speakerPhotoCommitIfMatchToken({
      frozenAtUploadStart: input.ifMatchToken,
      resolveAtCommit: input.resolveIfMatchToken,
    }),
  });
}

export async function fetchPortalDocumentAccessUrl(
  kind: Extract<PartnerPortalDocumentKind, "ad_creative" | "logo" | "souvenir_writeup">
): Promise<string | null> {
  const res = await fetch(
    `/api/partner/portal-document-access?kind=${encodeURIComponent(kind)}`,
    { credentials: "same-origin", cache: "no-store" }
  );
  if (!res.ok) return null;
  const payload = (await res.json().catch(() => null)) as { url?: string } | null;
  return typeof payload?.url === "string" ? payload.url : null;
}

export async function fetchSpeakerPhotoAccessUrl(input: {
  eventId: string;
  seminarId: string;
  speakerId: string;
}): Promise<string | null> {
  const params = new URLSearchParams(input);
  const res = await fetch(`/api/partner/speaker-photo-access?${params}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) return null;
  const payload = (await res.json().catch(() => null)) as { url?: string } | null;
  return typeof payload?.url === "string" ? payload.url : null;
}
