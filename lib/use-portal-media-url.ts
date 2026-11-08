"use client";

import { useEffect, useState } from "react";

import {
  fetchPortalDocumentAccessUrl,
  fetchSpeakerPhotoAccessUrl,
} from "@/lib/portal-storage-upload";
import { isStorageBackedPortalDocument } from "@/lib/partner-portal-document";
import { isStorageBackedSpeakerPhoto } from "@/lib/partner-portal-speaker";
import type { PartnerPortalDocument, PartnerSeminarSpeakerDetail } from "@/lib/types";

export function usePortalDocumentUrl(
  kind: "logo" | "souvenir_writeup" | "ad_creative",
  doc?: PartnerPortalDocument | null
): string | null {
  const legacy = doc && !isStorageBackedPortalDocument(doc) ? doc.url?.trim() || null : null;
  const [url, setUrl] = useState<string | null>(legacy);

  useEffect(() => {
    if (!doc) {
      setUrl(null);
      return;
    }
    if (!isStorageBackedPortalDocument(doc)) {
      setUrl(doc.url?.trim() || null);
      return;
    }
    let cancelled = false;
    void fetchPortalDocumentAccessUrl(kind).then((next) => {
      if (!cancelled) setUrl(next);
    });
    return () => {
      cancelled = true;
    };
  }, [kind, doc?.storagePath, doc?.url, doc?.uploadedAt]);

  return url;
}

export function useSpeakerPhotoUrl(
  eventId: string,
  seminarId: string,
  speaker: PartnerSeminarSpeakerDetail,
  localPreview?: string | null
): string | null {
  const legacy =
    !isStorageBackedSpeakerPhoto(speaker) && speaker.photoUrl?.startsWith("blob:")
      ? speaker.photoUrl
      : !isStorageBackedSpeakerPhoto(speaker)
        ? speaker.photoUrl?.trim() || null
        : null;
  const [url, setUrl] = useState<string | null>(localPreview || legacy);

  useEffect(() => {
    if (localPreview) {
      setUrl(localPreview);
      return;
    }
    if (!isStorageBackedSpeakerPhoto(speaker) || !speaker.id) {
      const next = speaker.photoUrl?.startsWith("blob:")
        ? speaker.photoUrl
        : speaker.photoUrl?.trim() || null;
      setUrl(next);
      return;
    }
    let cancelled = false;
    void fetchSpeakerPhotoAccessUrl({
      eventId,
      seminarId,
      speakerId: speaker.id,
    }).then((next) => {
      if (!cancelled) setUrl(next);
    });
    return () => {
      cancelled = true;
    };
  }, [
    eventId,
    seminarId,
    speaker.id,
    speaker.photoStoragePath,
    speaker.photoUrl,
    localPreview,
  ]);

  return url;
}
