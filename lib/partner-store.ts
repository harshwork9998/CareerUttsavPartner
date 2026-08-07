import { generateId } from "@/lib/utils";
import { fetchAdminEvents, fetchAdminPartners } from "@/lib/admin-api";
import {
  hashPartnerPassword,
  isPartnerPasswordHash,
} from "@/lib/partner-password";
import { seedPartners, mockEvents } from "@/lib/seed-data";
import type {
  Partner,
  PartnerPortalDocument,
  PartnerRepresentative,
  PartnerRepresentativesSubmission,
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

function migratePartnerPassword(partner: Partner): Partner {
  const plaintext = partner.portalTempPassword?.trim();
  if (plaintext && !isPartnerPasswordHash(partner.portalPasswordHash)) {
    return {
      ...partner,
      portalPasswordHash: hashPartnerPassword(plaintext),
      portalTempPassword: undefined,
    };
  }
  if (partner.portalTempPassword) {
    const { portalTempPassword: _removed, ...rest } = partner;
    return rest;
  }
  return partner;
}

function partners(): Partner[] {
  if (!globalStore.__cuPartners) {
    globalStore.__cuPartners = structuredClone(seedPartners).map(
      migratePartnerPassword
    );
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
      // Admin id + credentials win so Chapter 8 passwords sync correctly.
      // Prefer hash from Admin; keep local hash if Admin only reports hasPortalPassword.
      const nextHash =
        adminPartner.portalPasswordHash ??
        existing.portalPasswordHash;
      store[idx] = {
        ...existing,
        ...adminPartner,
        id: adminPartner.id,
        portalLogin: adminPartner.portalLogin ?? existing.portalLogin,
        portalInviteEmail:
          adminPartner.portalInviteEmail ?? existing.portalInviteEmail,
        portalPasswordHash: nextHash,
        portalTempPassword: undefined,
        portalInviteSentAt:
          adminPartner.portalInviteSentAt ?? existing.portalInviteSentAt,
        portalPasswordChangedAt:
          adminPartner.portalPasswordChangedAt ??
          existing.portalPasswordChangedAt,
        portalPasswordPromptSkippedAt:
          adminPartner.portalPasswordPromptSkippedAt ??
          existing.portalPasswordPromptSkippedAt,
        portalAuthVersion:
          adminPartner.portalAuthVersion ?? existing.portalAuthVersion,
        // Preserve portal-uploaded content if Admin snapshot is older/empty
        portalDocuments:
          adminPartner.portalDocuments ?? existing.portalDocuments,
        portalSeminarSpeakers:
          adminPartner.portalSeminarSpeakers ?? existing.portalSeminarSpeakers,
        portalRepresentatives:
          adminPartner.portalRepresentatives ?? existing.portalRepresentatives,
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
  globalStore.__cuPartners = structuredClone(seedPartners).map(
    migratePartnerPassword
  );
  globalStore.__cuEvents = structuredClone(mockEvents);
}

/** Store a new portal password as a hash (never plaintext). */
export function setPartnerPasswordHash(
  partnerId: string,
  password: string
): Partner | null {
  return updatePartner(partnerId, {
    portalPasswordHash: hashPartnerPassword(password),
    portalTempPassword: undefined,
  });
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

/** True only when the session login still belongs to this exact partner. */
export function partnerOwnsLogin(partner: Partner, login: string) {
  const normalized = login.trim().toLowerCase();
  if (!normalized) return false;
  return (
    partner.portalLogin?.toLowerCase() === normalized ||
    partner.portalInviteEmail?.toLowerCase() === normalized
  );
}

/**
 * Resolve the partner for a session. Never fall back to another partner by
 * login alone — that could open the wrong portal after an id remap/delete.
 */
export function getPartnerForSession(session: {
  partnerId: string;
  login: string;
}) {
  const partner = getPartnerById(session.partnerId);
  if (!partner) return null;
  if (!partnerOwnsLogin(partner, session.login)) return null;
  return partner;
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

/** Insert/update a minimal partner after Admin login succeeds. */
export function upsertPartnerFromAdminAuth(input: {
  id: string;
  name: string;
  portalLogin?: string;
  portalInviteEmail?: string;
  portalInviteSentAt?: string;
  portalPasswordChangedAt?: string;
  portalAuthVersion?: number;
  /** Plaintext from this login only — hashed before store. */
  portalPassword?: string;
  portalPasswordHash?: string;
}): Partner {
  const store = partners();
  const idx = store.findIndex(
    (p) =>
      p.id === input.id ||
      (input.portalLogin &&
        p.portalLogin?.toLowerCase() === input.portalLogin.toLowerCase())
  );
  const base: Partner =
    idx >= 0
      ? store[idx]
      : {
          id: input.id,
          name: input.name,
          city: "",
          state: "",
          eventIds: [],
          stage: "Confirmed",
          portalDocuments: [],
          portalSeminarSpeakers: [],
        };

  const portalPasswordHash = input.portalPassword
    ? hashPartnerPassword(input.portalPassword)
    : input.portalPasswordHash ?? base.portalPasswordHash;

  const updated: Partner = {
    ...base,
    id: input.id,
    name: input.name || base.name,
    portalLogin: input.portalLogin ?? base.portalLogin,
    portalInviteEmail: input.portalInviteEmail ?? base.portalInviteEmail,
    portalInviteSentAt:
      input.portalInviteSentAt ??
      base.portalInviteSentAt ??
      new Date().toISOString(),
    portalPasswordChangedAt:
      input.portalPasswordChangedAt ?? base.portalPasswordChangedAt,
    portalAuthVersion: input.portalAuthVersion ?? base.portalAuthVersion ?? 0,
    portalPasswordHash,
    portalTempPassword: undefined,
  };

  if (idx >= 0) store[idx] = updated;
  else store.push(updated);
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

export function removePortalDocument(
  partnerId: string,
  kind: PartnerPortalDocument["kind"]
) {
  const partner = getPartnerById(partnerId);
  if (!partner) return null;
  const docs = (partner.portalDocuments ?? []).filter((d) => d.kind !== kind);
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

export function setRepresentatives(
  partnerId: string,
  eventId: string,
  count: number,
  representatives: PartnerRepresentative[]
) {
  const partner = getPartnerById(partnerId);
  if (!partner) return null;
  const rows = [...(partner.portalRepresentatives ?? [])];
  const idx = rows.findIndex((r) => r.eventId === eventId);
  const row: PartnerRepresentativesSubmission = {
    eventId,
    count,
    representatives,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) rows[idx] = row;
  else rows.push(row);
  return updatePartner(partnerId, { portalRepresentatives: rows });
}

export function getEvents() {
  return [...events()];
}

/** Reset store to seed (dev helper) */
export function resetPartnerStore() {
  reloadPartnerStoreFromSeed();
}
