import {
  commitPortalDocumentUpload,
  fetchPortalDocumentAccessUrl,
  requestPortalDocumentUploadIntent,
  tusUploadToPortalStorage,
  uploadPortalDocumentWithStorage,
  type PortalSignedUploadIntent,
} from "@/lib/portal-storage-upload";
import { validateUploadFile } from "@/lib/upload-policy";
import type { Partner } from "@/lib/types";

export type AdCreativeUploadIntent = PortalSignedUploadIntent;

export async function requestAdCreativeUploadIntent(file: File) {
  const validation = validateUploadFile({
    fileName: file.name,
    fileSizeBytes: file.size,
    kind: "ad_creative",
    mimeType: file.type,
  });
  if (validation) return { ok: false as const, error: validation };
  return requestPortalDocumentUploadIntent({ kind: "ad_creative", file });
}

export async function tusUploadAdCreative(input: {
  file: File;
  intent: AdCreativeUploadIntent;
  onProgress: (percent: number) => void;
  onRetry?: () => void;
}) {
  return tusUploadToPortalStorage(input);
}

export async function commitAdCreativeUpload(input: {
  file: File;
  intent: AdCreativeUploadIntent;
  label: string;
}): Promise<
  | { ok: true; partner: Partner }
  | { ok: false; error: string }
> {
  return commitPortalDocumentUpload({
    kind: "ad_creative",
    file: input.file,
    intent: input.intent,
    label: input.label,
  });
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
  return uploadPortalDocumentWithStorage({
    kind: "ad_creative",
    ...input,
  });
}

export { fetchPortalDocumentAccessUrl };
