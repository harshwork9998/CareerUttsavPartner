import { describe, expect, it } from "vitest";

import {
  applyCommittedPartnerToDashboard,
  applyRemovedDocumentToDashboard,
  mergeDashboardPayload,
  mergePortalDocuments,
  mergeSeminarSpeakerSubmissions,
  pickFresherPortalDocument,
} from "@/lib/portal-dashboard-merge";
import type {
  Partner,
  PartnerPortalDocument,
  PartnerSeminarSpeakerSubmission,
} from "@/lib/types";

const NOW = Date.parse("2026-11-08T15:30:00.000Z");
const recent = (secondsAgo: number) =>
  new Date(NOW - secondsAgo * 1000).toISOString();

function doc(
  kind: PartnerPortalDocument["kind"],
  uploadedAt: string,
  extra: Partial<PartnerPortalDocument> = {}
): PartnerPortalDocument {
  return {
    id: `${kind}-${uploadedAt}`,
    kind,
    label: kind,
    fileName: `${kind}.png`,
    mimeType: "image/png",
    url: extra.url ?? "",
    fileSizeBytes: extra.fileSizeBytes ?? 12,
    uploadedAt,
    storageProvider: extra.storageProvider ?? "supabase",
    storageBucket: extra.storageBucket ?? "partner-portal-assets",
    storagePath:
      extra.storagePath ?? `partners/p/${kind}/${uploadedAt}.png`,
    ...extra,
  };
}

function partner(partial: Partial<Partner> = {}): Partner {
  return {
    id: "partner-1",
    name: "Test University",
    city: "Bengaluru",
    state: "Karnataka",
    eventIds: ["event-1"],
    stage: "confirmed",
    ...partial,
  };
}

describe("mergePortalDocuments", () => {
  it("keeps a just-committed document when a delayed refetch omits it", () => {
    const committed = doc("logo", recent(2));
    const olderAd = doc("ad_creative", recent(90));
    const revisions = {
      logo: { action: "upsert" as const, storagePath: committed.storagePath, at: NOW },
    };
    expect(mergePortalDocuments([committed], [], revisions)).toEqual([committed]);
    expect(
      mergePortalDocuments([committed, olderAd], [olderAd], revisions)
    ).toEqual([olderAd, committed]);
  });

  it("does not invent an empty document list during replacement", () => {
    const previous = doc("souvenir_writeup", recent(40));
    const next = doc("souvenir_writeup", recent(1));
    expect(mergePortalDocuments([previous], [next])).toEqual([next]);
    expect(
      mergePortalDocuments([previous], [], {
        souvenir_writeup: { action: "upsert", storagePath: previous.storagePath, at: NOW },
      })
    ).toEqual([previous]);
  });

  it("lets a stale GET lose to the committed newer file", () => {
    const committed = doc("ad_creative", recent(1));
    const stale = doc("ad_creative", recent(10_000));
    expect(mergePortalDocuments([committed], [stale])).toEqual([committed]);
  });

  it("still displays legacy data URLs", () => {
    const legacy = doc("logo", "2026-01-01T00:00:00.000Z", {
      url: "data:image/png;base64,abc",
      storageProvider: undefined,
      storageBucket: undefined,
      storagePath: undefined,
    });
    expect(mergePortalDocuments([legacy], [legacy])).toEqual([legacy]);
    expect(
      pickFresherPortalDocument(legacy, undefined)?.url
    ).toBe("data:image/png;base64,abc");
  });

  it("does not restore a removed document from a stale GET", () => {
    const old = doc("logo", recent(20));
    expect(
      mergePortalDocuments([], [old], {
        logo: { action: "remove", at: NOW },
      })
    ).toEqual([]);
  });

  it("drops a cached document after authorized deletion without a local upsert revision", () => {
    const existing = doc("logo", recent(5));
    expect(mergePortalDocuments([existing], [])).toEqual([]);
  });
});

describe("mergeSeminarSpeakerSubmissions", () => {
  it("keeps an existing photograph when a text-only refetch omits it", () => {
    const current: PartnerSeminarSpeakerSubmission[] = [
      {
        eventId: "event-1",
        seminarId: "seminar-1",
        updatedAt: "2026-11-08T15:00:00.000Z",
        speakers: [
          {
            id: "speaker-1",
            name: "Ada",
            photoStorageProvider: "supabase",
            photoStorageBucket: "partner-portal-assets",
            photoStoragePath: "partners/p/speaker_photo/speaker-1/a.jpg",
            photoUrl: "",
          },
        ],
      },
    ];
    const incoming: PartnerSeminarSpeakerSubmission[] = [
      {
        eventId: "event-1",
        seminarId: "seminar-1",
        updatedAt: "2026-11-08T15:29:00.000Z",
        speakers: [{ id: "speaker-1", name: "Ada Lovelace", photoUrl: "" }],
      },
    ];

    expect(mergeSeminarSpeakerSubmissions(current, incoming)[0].speakers[0]).toMatchObject({
      name: "Ada Lovelace",
      photoStoragePath: "partners/p/speaker_photo/speaker-1/a.jpg",
    });
  });

  it("keeps a just-committed photograph over a stale GET with an older photo", () => {
    const current: PartnerSeminarSpeakerSubmission[] = [
      {
        eventId: "event-1",
        seminarId: "seminar-1",
        updatedAt: "2026-11-08T15:29:00.000Z",
        speakers: [
          {
            id: "speaker-1",
            name: "Ada",
            photoStorageProvider: "supabase",
            photoStorageBucket: "partner-portal-assets",
            photoStoragePath: "partners/p/speaker_photo/speaker-1/new.jpg",
            photoUploadedAt: "2026-11-08T15:29:50.000Z",
            photoUrl: "",
          },
        ],
      },
    ];
    const incoming: PartnerSeminarSpeakerSubmission[] = [
      {
        eventId: "event-1",
        seminarId: "seminar-1",
        updatedAt: "2026-11-08T15:20:00.000Z",
        speakers: [
          {
            id: "speaker-1",
            name: "Ada",
            photoStorageProvider: "supabase",
            photoStorageBucket: "partner-portal-assets",
            photoStoragePath: "partners/p/speaker_photo/speaker-1/old.jpg",
            photoUploadedAt: "2026-11-08T15:00:00.000Z",
            photoUrl: "",
          },
        ],
      },
    ];
    expect(mergeSeminarSpeakerSubmissions(current, incoming)[0].speakers[0]?.photoStoragePath).toBe(
      "partners/p/speaker_photo/speaker-1/new.jpg"
    );
  });

  it("applies a committed photograph instead of keeping the previous cache entry", () => {
    const current: PartnerSeminarSpeakerSubmission[] = [
      {
        eventId: "event-1",
        seminarId: "seminar-1",
        updatedAt: "2026-11-08T15:00:00.000Z",
        speakers: [
          {
            id: "speaker-1",
            name: "Ada",
            photoStorageProvider: "supabase",
            photoStorageBucket: "partner-portal-assets",
            photoStoragePath: "partners/p/speaker_photo/speaker-1/old.jpg",
            photoUploadedAt: "2026-11-08T15:00:00.000Z",
            photoUrl: "",
          },
        ],
      },
    ];
    const incoming: PartnerSeminarSpeakerSubmission[] = [
      {
        eventId: "event-1",
        seminarId: "seminar-1",
        updatedAt: "2026-11-08T15:29:50.000Z",
        speakers: [
          {
            id: "speaker-1",
            name: "Ada",
            photoStorageProvider: "supabase",
            photoStorageBucket: "partner-portal-assets",
            photoStoragePath: "partners/p/speaker_photo/speaker-1/new.jpg",
            photoUploadedAt: "2026-11-08T15:29:50.000Z",
            photoUrl: "",
          },
        ],
      },
    ];
    expect(mergeSeminarSpeakerSubmissions(current, incoming)[0].speakers[0]?.photoStoragePath).toBe(
      "partners/p/speaker_photo/speaker-1/new.jpg"
    );
  });
});

describe("dashboard cache after commit", () => {
  it("applies committed metadata before a delayed dashboard refetch", () => {
    const current = {
      partner: partner({ portalDocuments: [] }),
      packages: [],
      mustChangePassword: false,
      uploadStatus: {
        items: [],
        missing: [],
        allComplete: true,
        progress: 1,
        completed: 0,
        total: 0,
        entitlements: {} as never,
      },
    };
    const committed = partner({
      portalDocuments: [doc("logo", new Date().toISOString())],
    });

    const applied = applyCommittedPartnerToDashboard(current, committed);
    expect(applied?.partner.portalDocuments).toEqual(committed.portalDocuments);

    const staleRefetch = mergeDashboardPayload(applied, {
      partner: partner({ portalDocuments: [] }),
      packages: [],
      mustChangePassword: false,
    });
    expect(staleRefetch.partner.portalDocuments).toEqual(committed.portalDocuments);
  });

  it("does not restore a removed logo from a stale GET", () => {
    const existing = doc("logo", recent(10));
    const current = {
      partner: partner({ portalDocuments: [existing] }),
      packages: [],
      mustChangePassword: false,
    };
    const removed = applyRemovedDocumentToDashboard(current, "logo");
    const stale = mergeDashboardPayload(removed, {
      partner: partner({ portalDocuments: [existing] }),
      packages: [],
      mustChangePassword: false,
    });
    expect(stale.partner.portalDocuments).toEqual([]);
  });

  it("does not drop a previous document when commit never happened", () => {
    const existing = doc("logo", "2026-11-08T10:00:00.000Z");
    const current = {
      partner: partner({ portalDocuments: [existing] }),
      packages: [],
      mustChangePassword: false,
    };
    const failedRefetchKept = current;
    expect(failedRefetchKept.partner.portalDocuments).toEqual([existing]);
  });
});
