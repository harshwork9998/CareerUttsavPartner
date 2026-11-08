"use client";

import { useEffect, useState } from "react";

import {
  fetchPortalDocumentAccessUrl,
  fetchSpeakerPhotoAccessUrl,
} from "@/lib/portal-storage-upload";
import { isStorageBackedPortalDocument } from "@/lib/partner-portal-document";
import { isStorageBackedSpeakerPhoto } from "@/lib/partner-portal-speaker";
import { resolvePortalMediaUrlState } from "@/lib/portal-upload-presentation";
import type { PartnerPortalDocument, PartnerSeminarSpeakerDetail } from "@/lib/types";

export function usePortalDocumentUrl(
  kind: "logo" | "souvenir_writeup" | "ad_creative",
  doc?: PartnerPortalDocument | null
): { url: string | null; isResolving: boolean } {
  const storageBacked = Boolean(doc && isStorageBackedPortalDocument(doc));
  const legacy =
    doc && !storageBacked ? doc.url?.trim() || null : null;
  const initial = resolvePortalMediaUrlState({
    docPresent: Boolean(doc),
    storageBacked,
    legacyUrl: legacy,
    previousUrl: null,
  });
  const [url, setUrl] = useState<string | null>(initial.url);
  const [isResolving, setIsResolving] = useState(initial.isResolving);

  useEffect(() => {
    if (!doc) {
      setUrl(null);
      setIsResolving(false);
      return;
    }
    if (!isStorageBackedPortalDocument(doc)) {
      setUrl(doc.url?.trim() || null);
      setIsResolving(false);
      return;
    }
    setIsResolving(true);
    let cancelled = false;
    void fetchPortalDocumentAccessUrl(kind).then((next) => {
      if (cancelled) return;
      if (next) setUrl(next);
      setIsResolving(false);
    });
    return () => {
      cancelled = true;
    };
  }, [kind, doc?.storagePath, doc?.url, doc?.uploadedAt]);

  return { url, isResolving };
}

export function useSpeakerPhotoUrl(
  eventId: string,
  seminarId: string,
  speaker: PartnerSeminarSpeakerDetail,
  localPreview?: string | null
): { url: string | null; isResolving: boolean } {
  const storageBacked = isStorageBackedSpeakerPhoto(speaker);
  const legacy =
    !storageBacked && speaker.photoUrl?.startsWith("blob:")
      ? speaker.photoUrl
      : !storageBacked
        ? speaker.photoUrl?.trim() || null
        : null;
  const initial = resolvePortalMediaUrlState({
    docPresent: Boolean(
      storageBacked || speaker.photoUrl?.trim() || localPreview
    ),
    storageBacked,
    legacyUrl: legacy,
    previousUrl: null,
    localPreview,
  });
  const [url, setUrl] = useState<string | null>(initial.url);
  const [isResolving, setIsResolving] = useState(initial.isResolving);

  useEffect(() => {
    if (localPreview) {
      setUrl(localPreview);
      setIsResolving(false);
      return;
    }
    if (!isStorageBackedSpeakerPhoto(speaker) || !speaker.id) {
      const next = speaker.photoUrl?.startsWith("blob:")
        ? speaker.photoUrl
        : speaker.photoUrl?.trim() || null;
      setUrl(next);
      setIsResolving(false);
      return;
    }
    setIsResolving(true);
    let cancelled = false;
    void fetchSpeakerPhotoAccessUrl({
      eventId,
      seminarId,
      speakerId: speaker.id,
    }).then((next) => {
      if (cancelled) return;
      if (next) setUrl(next);
      setIsResolving(false);
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

  return { url, isResolving };
}
