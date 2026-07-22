import { generateId } from "@/lib/utils";
import { fetchAdminEvents, fetchAdminPartners } from "@/lib/admin-api";
import { seedPartners, mockEvents } from "@/lib/seed-data";
import type {
  Partner,
  PartnerPortalDocument,
  PartnerSeminarSpeakerSubmission,
  Event,
} from "@/lib/types";

/** In-memory partner store — seed first, then merged with Admin API partners */
let partnersStore: Partner[] = structuredClone(seedPartners);
let eventsStore: Event[] = structuredClone(mockEvents);

export async function mergeAdminPartners() {
  const fromAdmin = await fetchAdminPartners();
  for (const adminPartner of fromAdmin) {
    const login = adminPartner.portalLogin?.toLowerCase();
    if (!login) continue;
    const idx = partnersStore.findIndex(
      (p) => p.portalLogin?.toLowerCase() === login
    );
    if (idx >= 0) {
      partnersStore[idx] = { ...partnersStore[idx], ...adminPartner };
    } else {
      partnersStore.push(adminPartner);
    }
  }

  const fromAdminEvents = await fetchAdminEvents();
  if (fromAdminEvents.length > 0) {
    eventsStore = fromAdminEvents;
  }
}
export function reloadPartnerStoreFromSeed() {
  partnersStore = structuredClone(seedPartners);
}

export function getAllPartners() {
  return [...partnersStore];
}

export function getPartnerById(id: string) {
  return partnersStore.find((p) => p.id === id) ?? null;
}

export function getPartnerByLogin(login: string) {
  const normalized = login.trim().toLowerCase();
  return (
    partnersStore.find((p) => p.portalLogin?.toLowerCase() === normalized) ??
    null
  );
}

export function updatePartner(id: string, patch: Partial<Partner>) {
  const idx = partnersStore.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated = { ...partnersStore[idx], ...patch };
  partnersStore = partnersStore.map((p) => (p.id === id ? updated : p));
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
  return [...eventsStore];
}

/** Reset store to seed (dev helper) */
export function resetPartnerStore() {
  partnersStore = structuredClone(seedPartners);
  eventsStore = structuredClone(mockEvents);
}
