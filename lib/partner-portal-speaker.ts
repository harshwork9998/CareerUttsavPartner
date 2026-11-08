import { PORTAL_STORAGE_PROVIDER_SUPABASE } from "@/lib/partner-portal-document";
import type { PartnerSeminarSpeakerDetail } from "@/lib/types";

export type SpeakerPhotoStorageFields = Pick<
  PartnerSeminarSpeakerDetail,
  | "photoUrl"
  | "photoStorageProvider"
  | "photoStorageBucket"
  | "photoStoragePath"
  | "photoFileName"
  | "photoMimeType"
  | "photoFileSizeBytes"
  | "photoUploadedAt"
>;

export function isStorageBackedSpeakerPhoto(
  speaker: Pick<
    PartnerSeminarSpeakerDetail,
    "photoStorageProvider" | "photoStorageBucket" | "photoStoragePath"
  > | null | undefined
): boolean {
  return (
    speaker?.photoStorageProvider === PORTAL_STORAGE_PROVIDER_SUPABASE &&
    Boolean(speaker.photoStorageBucket?.trim()) &&
    Boolean(speaker.photoStoragePath?.trim())
  );
}

export function speakerHasPersistedPhoto(
  speaker: SpeakerPhotoStorageFields | null | undefined
): boolean {
  if (!speaker) return false;
  if (isStorageBackedSpeakerPhoto(speaker)) return true;
  const url = speaker.photoUrl?.trim() ?? "";
  return (
    url.startsWith("data:") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  );
}

export function speakerPhotoMatchToken(
  speaker: SpeakerPhotoStorageFields | null | undefined
): string {
  if (!speaker) return "";
  return speaker.photoStoragePath?.trim() || speaker.photoUrl?.trim() || "";
}

export function speakerPhotoStorageRef(
  speaker: SpeakerPhotoStorageFields | null | undefined
): { storageBucket: string; storagePath: string } | null {
  if (!speaker || !isStorageBackedSpeakerPhoto(speaker)) return null;
  return {
    storageBucket: speaker.photoStorageBucket!.trim(),
    storagePath: speaker.photoStoragePath!.trim(),
  };
}

export function findPortalSpeakerInPartner(
  partner: { portalSeminarSpeakers?: Array<{ eventId: string; seminarId: string; speakers: PartnerSeminarSpeakerDetail[] }> } | null | undefined,
  eventId: string,
  seminarId: string,
  speakerId?: string | null
): PartnerSeminarSpeakerDetail | undefined {
  const id = speakerId?.trim();
  if (!id) return undefined;
  const row = partner?.portalSeminarSpeakers?.find(
    (entry) => entry.eventId === eventId && entry.seminarId === seminarId
  );
  return row?.speakers.find((speaker) => speaker.id === id);
}

/** Authoritative compare-and-swap token from saved partner data, not draft-only fields. */
export function speakerPhotoIfMatchTokenForUpload(
  partner: Parameters<typeof findPortalSpeakerInPartner>[0],
  eventId: string,
  seminarId: string,
  speakerId?: string | null,
  localFallback?: PartnerSeminarSpeakerDetail | null
): string | undefined {
  const fromPartner = findPortalSpeakerInPartner(partner, eventId, seminarId, speakerId);
  const authority = fromPartner ?? localFallback;
  if (!authority || !speakerHasPersistedPhoto(authority)) return undefined;
  return speakerPhotoMatchToken(authority);
}

/** Prefer the token frozen when the upload started; never adopt a newer refetch at commit. */
export function speakerPhotoCommitIfMatchToken(input: {
  frozenAtUploadStart?: string;
  resolveAtCommit?: () => string | undefined;
}): string | undefined {
  if (input.frozenAtUploadStart !== undefined) {
    return input.frozenAtUploadStart;
  }
  return input.resolveAtCommit?.();
}
