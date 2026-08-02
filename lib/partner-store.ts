import { generateId } from "@/lib/utils";
import { fetchAdminEvents, fetchAdminPartners } from "@/lib/admin-api";
import { seedPartners, mockEvents } from "@/lib/seed-data";
import type {
  Partner,
  PartnerPortalDocument,
  PartnerSeminarSpeakerSubmission,
  Event,
} from "@/lib/types";

/**
 * Keep the in-memory store on globalThis so Turbopack/HMR does not create
 * separate empty copies per route bundle in dev.
 */
const globalStore = globalThis as unknown as {
  __cuPartners?: Partner[];
  __cuEvents?: Event[];
};

function partners(): Partner[] {
  if (!globalStore.__cuPartners) {
    globalStore.__cuPartners = structuredClone(seedPartners);
  }
  return globalStore.__cuPartners;
}

function events(): Event[] {
  if (!globalStore.__cuEvents) {
    globalStore.__cuEvents = structuredClone(mockEvents);
  }
  return globalStore.__cuEvents;
}

export async function mergeAdminPartners() {
  const fromAdmin = await fetchAdminPartners();
  const store = partners();
  for (const adminPartner of fromAdmin) {
    const login = adminPartner.portalLogin?.toLowerCase();
    const inviteEmail = adminPartner.portalInviteEmail?.toLowerCase();
    const idx = store.findIndex(
      (p) =>
        p.id === adminPartner.id ||
        (login && p.portalLogin?.toLowerCase() === login) ||
        (inviteEmail && p.portalInviteEmail?.toLowerCase() === inviteEmail)
    );
    if (idx >= 0) {
      const existing = store[idx];
      // Keep stable id + don't wipe portal credentials with undefined admin fields
      store[idx] = {
        ...existing,
        ...adminPartner,
        id: existing.id,
        portalLogin: adminPartner.portalLogin ?? existing.portalLogin,
        portalInviteEmail:
          adminPartner.portalInviteEmail ?? existing.portalInviteEmail,
        portalTempPassword:
          adminPartner.portalTempPassword ?? existing.portalTempPassword,
        portalInviteSentAt:
          adminPartner.portalInviteSentAt ?? existing.portalInviteSentAt,
        portalPasswordChangedAt:
          adminPartner.portalPasswordChangedAt ??
          existing.portalPasswordChangedAt,
        portalAuthVersion:
          adminPartner.portalAuthVersion ?? existing.portalAuthVersion,
      };
    } else {
      store.push(adminPartner);
    }
  }

  const fromAdminEvents = await fetchAdminEvents();
  if (fromAdminEvents.length > 0) {
    globalStore.__cuEvents = fromAdminEvents;
  }
}

export function reloadPartnerStoreFromSeed() {
  globalStore.__cuPartners = structuredClone(seedPartners);
  globalStore.__cuEvents = structuredClone(mockEvents);
}

export function getAllPartners() {
  return [...partners()];
}

export function getPartnerById(id: string) {
  if (!id) return null;
  return partners().find((p) => p.id === id) ?? null;
}

export function getPartnerByLogin(login: string) {
  if (!login?.trim()) return null;
  const normalized = login.trim().toLowerCase();
  return (
    partners().find(
      (p) =>
        p.portalLogin?.toLowerCase() === normalized ||
        p.portalInviteEmail?.toLowerCase() === normalized
    ) ?? null
  );
}

export function bumpPartnerAuthVersion(id: string) {
  const partner = getPartnerById(id);
  if (!partner) return null;
  const next = (partner.portalAuthVersion ?? 0) + 1;
  return updatePartner(id, { portalAuthVersion: next });
}

export function updatePartner(id: string, patch: Partial<Partner>) {
  const store = partners();
  const idx = store.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated = { ...store[idx], ...patch };
  store[idx] = updated;
  return updated;
}

export function upsertPortalDocument(
  partnerId: string,
  doc: Omit<PartnerPortalDocument, "id" | "uploadedAt"> & { id?: string }
) {
  const partner = getPartnerById(partnerId);
  if (!partner) return null;
  const docs = [...(partner.portalDocuments ?? [])];
  const idx = docs.findIndex((d) => d.kind === doc.kind);
  const next: PartnerPortalDocument = {
    id: doc.id ?? generateId(),
    kind: doc.kind,
    label: doc.label,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    url: doc.url,
    fileSizeBytes: doc.fileSizeBytes,
    uploadedAt: new Date().toISOString(),
  };
  if (idx >= 0) docs[idx] = next;
  else docs.push(next);
  return updatePartner(partnerId, { portalDocuments: docs });
}

export function setSeminarSpeakers(
  partnerId: string,
  eventId: string,
  seminarId: string,
  speakers: PartnerSeminarSpeakerSubmission["speakers"]
) {
  const partner = getPartnerById(partnerId);
  if (!partner) return null;
  const rows = [...(partner.portalSeminarSpeakers ?? [])];
  const idx = rows.findIndex(
    (r) => r.eventId === eventId && r.seminarId === seminarId
  );
  const row: PartnerSeminarSpeakerSubmission = {
    eventId,
    seminarId,
    speakers,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) rows[idx] = row;
  else rows.push(row);
  return updatePartner(partnerId, { portalSeminarSpeakers: rows });
}

export function getEvents() {
  return [...events()];
}

/** Reset store to seed (dev helper) */
export function resetPartnerStore() {
  reloadPartnerStoreFromSeed();
}
