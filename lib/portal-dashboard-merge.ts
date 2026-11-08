import { getPartnerPortalUploadStatus } from "@/lib/partner-portal-docs";
import { findSubmittedPortalDocument } from "@/lib/partner-portal-document";
import {
  speakerHasPersistedPhoto,
  speakerPhotoMatchToken,
} from "@/lib/partner-portal-speaker";
import type { PartnerSeminarTopicCatalog } from "@/lib/seminar-topics";
import type {
  EventPackageSummary,
  Partner,
  PartnerPortalDocument,
  PartnerSeminarSpeakerDetail,
  PartnerSeminarSpeakerSubmission,
} from "@/lib/types";

export type PortalDocumentRevision = {
  action: "upsert" | "remove";
  uploadedAt?: string;
  storagePath?: string;
  at: number;
};

export type PortalClientRevisions = {
  documents: Record<string, PortalDocumentRevision>;
};

export type PartnerDashboardCache = {
  partner: Partner;
  packages: EventPackageSummary[];
  seminarTopics?: PartnerSeminarTopicCatalog | null;
  mustChangePassword: boolean;
  uploadStatus?: ReturnType<typeof getPartnerPortalUploadStatus>;
  clientRevisions?: PortalClientRevisions;
};

export function portalDocumentKindKey(
  kind: PartnerPortalDocument["kind"] | string
): string {
  return kind === "writeup" ? "souvenir_writeup" : kind;
}

export function portalDocumentTimestamp(
  doc: Pick<PartnerPortalDocument, "uploadedAt"> | null | undefined
): number {
  if (!doc?.uploadedAt) return 0;
  const value = Date.parse(doc.uploadedAt);
  return Number.isFinite(value) ? value : 0;
}

export function pickFresherPortalDocument(
  current?: PartnerPortalDocument,
  incoming?: PartnerPortalDocument
): PartnerPortalDocument | undefined {
  if (!current) return incoming;
  if (!incoming) return current;
  return portalDocumentTimestamp(current) > portalDocumentTimestamp(incoming)
    ? current
    : incoming;
}

export function mergePortalDocuments(
  current: PartnerPortalDocument[] | null | undefined,
  incoming: PartnerPortalDocument[] | null | undefined,
  revisions: PortalClientRevisions["documents"] = {}
): PartnerPortalDocument[] {
  const byKind = new Map<string, PartnerPortalDocument>();

  for (const doc of incoming ?? []) {
    const key = portalDocumentKindKey(doc.kind);
    const revision = revisions[key];
    if (
      revision?.action === "remove" &&
      portalDocumentTimestamp(doc) <= revision.at
    ) {
      continue;
    }
    byKind.set(key, doc);
  }

  for (const doc of current ?? []) {
    const key = portalDocumentKindKey(doc.kind);
    const next = byKind.get(key);
    const revision = revisions[key];
    if (!next) {
      if (revision?.action === "upsert") {
        byKind.set(key, doc);
      }
      continue;
    }
    if (portalDocumentTimestamp(doc) > portalDocumentTimestamp(next)) {
      byKind.set(key, doc);
    }
  }

  return [...byKind.values()];
}

export function markDocumentUpsertRevision(
  revisions: PortalClientRevisions | undefined,
  doc: PartnerPortalDocument,
  at = Date.now()
): PortalClientRevisions {
  const documents = { ...(revisions?.documents ?? {}) };
  documents[portalDocumentKindKey(doc.kind)] = {
    action: "upsert",
    uploadedAt: doc.uploadedAt,
    storagePath: doc.storagePath,
    at,
  };
  return { documents };
}

export function markDocumentRemoveRevision(
  revisions: PortalClientRevisions | undefined,
  kind: PartnerPortalDocument["kind"] | string,
  at = Date.now()
): PortalClientRevisions {
  const documents = { ...(revisions?.documents ?? {}) };
  documents[portalDocumentKindKey(kind)] = { action: "remove", at };
  return { documents };
}

export function revisionsFromCommittedPartner(
  previous: Partner | undefined,
  next: Partner,
  revisions: PortalClientRevisions | undefined,
  at = Date.now()
): PortalClientRevisions {
  let current = revisions ?? { documents: {} };
  const previousByKind = new Map(
    (previous?.portalDocuments ?? []).map((doc) => [portalDocumentKindKey(doc.kind), doc])
  );
  for (const doc of next.portalDocuments ?? []) {
    const key = portalDocumentKindKey(doc.kind);
    const prior = previousByKind.get(key);
    if (
      !prior ||
      prior.storagePath !== doc.storagePath ||
      prior.uploadedAt !== doc.uploadedAt ||
      prior.fileName !== doc.fileName
    ) {
      current = markDocumentUpsertRevision(current, doc, at);
    }
  }
  return current;
}

function speakerPhotoTime(speaker: PartnerSeminarSpeakerDetail): number {
  const value = Date.parse(speaker.photoUploadedAt ?? "");
  return Number.isFinite(value) ? value : 0;
}

function withSpeakerPhoto(
  into: PartnerSeminarSpeakerDetail,
  from: PartnerSeminarSpeakerDetail
): PartnerSeminarSpeakerDetail {
  return {
    ...into,
    photoUrl: from.photoUrl,
    photoStorageProvider: from.photoStorageProvider,
    photoStorageBucket: from.photoStorageBucket,
    photoStoragePath: from.photoStoragePath,
    photoFileName: from.photoFileName,
    photoMimeType: from.photoMimeType,
    photoFileSizeBytes: from.photoFileSizeBytes,
    photoUploadedAt: from.photoUploadedAt,
  };
}

function copySpeakerPhoto(
  from: PartnerSeminarSpeakerDetail,
  into: PartnerSeminarSpeakerDetail
): PartnerSeminarSpeakerDetail {
  if (!speakerHasPersistedPhoto(from)) return into;
  if (!speakerHasPersistedPhoto(into)) return withSpeakerPhoto(into, from);
  const fromToken = speakerPhotoMatchToken(from);
  const intoToken = speakerPhotoMatchToken(into);
  if (!fromToken || fromToken === intoToken) return into;
  return speakerPhotoTime(from) > speakerPhotoTime(into)
    ? withSpeakerPhoto(into, from)
    : into;
}

export function mergeSeminarSpeakerSubmissions(
  current: PartnerSeminarSpeakerSubmission[] | null | undefined,
  incoming: PartnerSeminarSpeakerSubmission[] | null | undefined
): PartnerSeminarSpeakerSubmission[] {
  if (!incoming) return current ?? [];
  if (!current?.length) return incoming;

  return incoming.map((row) => {
    const previous = current.find(
      (item) => item.eventId === row.eventId && item.seminarId === row.seminarId
    );
    if (!previous) return row;

    return {
      ...row,
      speakers: row.speakers.map((speaker, index) => {
        const previousSpeaker =
          (speaker.id
            ? previous.speakers.find((item) => item.id === speaker.id)
            : undefined) ?? previous.speakers[index];
        return previousSpeaker ? copySpeakerPhoto(previousSpeaker, speaker) : speaker;
      }),
    };
  });
}

export function mergePartnerAfterPortalFetch(
  current: Partner | undefined,
  incoming: Partner,
  revisions?: PortalClientRevisions
): Partner {
  if (!current) return incoming;
  return {
    ...current,
    ...incoming,
    eventIds: incoming.eventIds?.length ? incoming.eventIds : current.eventIds,
    eventPartnerships: incoming.eventPartnerships ?? current.eventPartnerships,
    deliverables: incoming.deliverables ?? current.deliverables,
    seminarSlotAssignments:
      incoming.seminarSlotAssignments ?? current.seminarSlotAssignments,
    portalDocuments: mergePortalDocuments(
      current.portalDocuments,
      incoming.portalDocuments,
      revisions?.documents
    ),
    portalFasciaName: incoming.portalFasciaName ?? current.portalFasciaName,
    portalWebsiteUrl: incoming.portalWebsiteUrl ?? current.portalWebsiteUrl,
    portalSmsContent: incoming.portalSmsContent ?? current.portalSmsContent,
    portalSeminarSpeakers: mergeSeminarSpeakerSubmissions(
      current.portalSeminarSpeakers,
      incoming.portalSeminarSpeakers
    ),
    portalRepresentatives:
      incoming.portalRepresentatives ?? current.portalRepresentatives,
  };
}

export function mergeDashboardPayload(
  current: PartnerDashboardCache | undefined,
  incoming: PartnerDashboardCache
): PartnerDashboardCache {
  if (incoming.mustChangePassword) return incoming;
  if (!current || current.mustChangePassword) {
    return {
      ...incoming,
      uploadStatus:
        incoming.uploadStatus ?? getPartnerPortalUploadStatus(incoming.partner),
    };
  }

  const partner = mergePartnerAfterPortalFetch(
    current.partner,
    incoming.partner,
    current.clientRevisions
  );
  return {
    ...incoming,
    partner,
    packages: incoming.packages?.length ? incoming.packages : current.packages,
    uploadStatus: getPartnerPortalUploadStatus(partner),
    clientRevisions: current.clientRevisions,
  };
}

export function applyCommittedPartnerToDashboard(
  current: PartnerDashboardCache | undefined,
  committedPartner: Partner
): PartnerDashboardCache | undefined {
  if (!current) return current;
  const clientRevisions = revisionsFromCommittedPartner(
    current.partner,
    committedPartner,
    current.clientRevisions
  );
  const partner = mergePartnerAfterPortalFetch(
    current.partner,
    committedPartner,
    clientRevisions
  );
  return {
    ...current,
    partner,
    uploadStatus: getPartnerPortalUploadStatus(partner),
    clientRevisions,
  };
}

export function applyRemovedDocumentToDashboard(
  current: PartnerDashboardCache | undefined,
  kind: PartnerPortalDocument["kind"]
): PartnerDashboardCache | undefined {
  if (!current) return current;
  const clientRevisions = markDocumentRemoveRevision(current.clientRevisions, kind);
  const partner = {
    ...current.partner,
    portalDocuments: (current.partner.portalDocuments ?? []).filter(
      (doc) => portalDocumentKindKey(doc.kind) !== portalDocumentKindKey(kind)
    ),
  };
  return {
    ...current,
    partner,
    uploadStatus: getPartnerPortalUploadStatus(partner),
    clientRevisions,
  };
}

export function documentFromCommittedPartner(
  partner: Partner | undefined,
  kind: PartnerPortalDocument["kind"]
): PartnerPortalDocument | undefined {
  return findSubmittedPortalDocument(partner?.portalDocuments, kind);
}
