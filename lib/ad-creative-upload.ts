import * as tus from "tus-js-client";

import { mapAdminPartnerToPortal } from "@/lib/admin-api";
import {
  PORTAL_STORAGE_SIZE_MESSAGE,
  UPLOAD_FAILED_MESSAGE,
  UPLOAD_SESSION_EXPIRED_MESSAGE,
  validateUploadFile,
} from "@/lib/upload-policy";
import {
  buildSupabaseStorageTusHeaders,
  readSupabasePublishableKey,
} from "@/lib/supabase-public-config";
import type { Partner } from "@/lib/types";

export type AdCreativeUploadIntent = {
  bucket: string;
  path: string;
  token: string;
  tusEndpoint: string;
};

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

export async function requestAdCreativeUploadIntent(file: File): Promise<
  | { ok: true; intent: AdCreativeUploadIntent }
  | { ok: false; error: string }
> {
  const validation = validateUploadFile({
    fileName: file.name,
    fileSizeBytes: file.size,
    kind: "ad_creative",
    mimeType: file.type,
  });
  if (validation) return { ok: false, error: validation };

  const res = await fetch("/api/partner/ad-creative/upload-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      fileSizeBytes: file.size,
    }),
  });
  const payload = (await res.json().catch(() => null)) as
    | (AdCreativeUploadIntent & { error?: string })
    | null;
  if (!res.ok) {
    return { ok: false, error: payload?.error ?? UPLOAD_FAILED_MESSAGE };
  }
  if (!payload?.bucket || !payload.path || !payload.token || !payload.tusEndpoint) {
    return { ok: false, error: UPLOAD_FAILED_MESSAGE };
  }
  return {
    ok: true,
    intent: {
      bucket: payload.bucket,
      path: payload.path,
      token: payload.token,
      tusEndpoint: payload.tusEndpoint,
    },
  };
}

export async function tusUploadAdCreative(input: {
  file: File;
  intent: AdCreativeUploadIntent;
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
        contentType: input.file.type || "application/octet-stream",
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

export async function commitAdCreativeUpload(input: {
  file: File;
  intent: AdCreativeUploadIntent;
  label: string;
}): Promise<
  | { ok: true; partner: Partner }
  | { ok: false; error: string }
> {
  const res = await fetch("/api/partner/ad-creative/commit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      label: input.label,
      fileName: input.file.name,
      mimeType: input.file.type,
      fileSizeBytes: input.file.size,
      storageBucket: input.intent.bucket,
      storagePath: input.intent.path,
    }),
  });
  const payload = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    return {
      ok: false,
      error:
        typeof payload?.error === "string" ? payload.error : UPLOAD_FAILED_MESSAGE,
    };
  }
  const partner = mapAdminPartnerToPortal(payload ?? {});
  if (!partner) {
    return { ok: false, error: UPLOAD_FAILED_MESSAGE };
  }
  return { ok: true, partner };
}

export async function uploadAdCreativeWithStorage(input: {
  file: File;
  label: string;
  onProgress: (percent: number) => void;
  onRetry?: () => void;
}): Promise<
  | { ok: true; partner: Partner }
  | { ok: false; error: string }
> {
  const intentResult = await requestAdCreativeUploadIntent(input.file);
  if (!intentResult.ok) return intentResult;

  const tusResult = await tusUploadAdCreative({
    file: input.file,
    intent: intentResult.intent,
    onProgress: input.onProgress,
    onRetry: input.onRetry,
  });
  if (!tusResult.ok) return tusResult;

  return commitAdCreativeUpload({
    file: input.file,
    intent: intentResult.intent,
    label: input.label,
  });
}

export async function fetchPortalDocumentAccessUrl(
  kind: "ad_creative" | "logo" | "souvenir_writeup"
): Promise<string | null> {
  const res = await fetch(
    `/api/partner/portal-document-access?kind=${encodeURIComponent(kind)}`,
    { credentials: "same-origin", cache: "no-store" }
  );
  if (!res.ok) return null;
  const payload = (await res.json().catch(() => null)) as { url?: string } | null;
  return typeof payload?.url === "string" ? payload.url : null;
}
