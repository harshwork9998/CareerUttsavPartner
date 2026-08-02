import type { Partner, SponsorshipTier, Event } from "@/lib/types";

const ADMIN_API_URL =
  process.env.ADMIN_API_URL ??
  process.env.NEXT_PUBLIC_ADMIN_API_URL ??
  "http://localhost:3000";

type AdminPartnerRecord = Record<string, unknown>;

export function mapAdminPartnerToPortal(raw: AdminPartnerRecord): Partner | null {
  if (typeof raw.id !== "string" || typeof raw.name !== "string") return null;

  return {
    id: raw.id,
    name: raw.name,
    city: typeof raw.city === "string" ? raw.city : "",
    state: typeof raw.state === "string" ? raw.state : "",
    eventIds: Array.isArray(raw.eventIds)
      ? raw.eventIds.filter((id): id is string => typeof id === "string")
      : [],
    stage: typeof raw.stage === "string" ? raw.stage : "Confirmed",
    sponsorshipTier: raw.sponsorshipTier as SponsorshipTier | undefined,
    eventPartnerships: raw.eventPartnerships as Partner["eventPartnerships"],
    deliverables: raw.deliverables as Partner["deliverables"],
    seminarSlotAssignments:
      raw.seminarSlotAssignments as Partner["seminarSlotAssignments"],
    portalLogin:
      typeof raw.portalLogin === "string" ? raw.portalLogin : undefined,
    portalTempPassword:
      typeof raw.portalTempPassword === "string"
        ? raw.portalTempPassword
        : undefined,
    portalPasswordChangedAt:
      typeof raw.portalPasswordChangedAt === "string"
        ? raw.portalPasswordChangedAt
        : undefined,
    portalPasswordPromptSkippedAt:
      typeof raw.portalPasswordPromptSkippedAt === "string"
        ? raw.portalPasswordPromptSkippedAt
        : undefined,
    portalAuthVersion:
      typeof raw.portalAuthVersion === "number"
        ? raw.portalAuthVersion
        : undefined,
    portalInviteEmail:
      typeof raw.portalInviteEmail === "string"
        ? raw.portalInviteEmail
        : undefined,
    portalInviteSentAt:
      typeof raw.portalInviteSentAt === "string"
        ? raw.portalInviteSentAt
        : undefined,
    portalDocuments: raw.portalDocuments as Partner["portalDocuments"],
    portalFasciaName:
      typeof raw.portalFasciaName === "string" ? raw.portalFasciaName : undefined,
    portalWebsiteUrl:
      typeof raw.portalWebsiteUrl === "string" ? raw.portalWebsiteUrl : undefined,
    portalSmsContent:
      typeof raw.portalSmsContent === "string" ? raw.portalSmsContent : undefined,
    portalSeminarSpeakers:
      raw.portalSeminarSpeakers as Partner["portalSeminarSpeakers"],
  };
}

export async function fetchAdminPartners(): Promise<Partner[]> {
  try {
    const res = await fetch(`${ADMIN_API_URL}/api/partners`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as AdminPartnerRecord[];
    return raw
      .map(mapAdminPartnerToPortal)
      .filter(
        (partner): partner is Partner =>
          partner !== null && Boolean(partner.portalInviteSentAt)
      );
  } catch {
    return [];
  }
}

export async function fetchAdminEvents(): Promise<Event[]> {
  try {
    const res = await fetch(`${ADMIN_API_URL}/api/partner-portal/events`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const raw = (await res.json()) as Event[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/** Fields written by the partner portal — synced back to Admin after each save. */
export function pickPortalSyncPatch(partner: Partner): Partial<Partner> {
  return {
    portalDocuments: partner.portalDocuments,
    portalFasciaName: partner.portalFasciaName,
    portalWebsiteUrl: partner.portalWebsiteUrl,
    portalSmsContent: partner.portalSmsContent,
    portalSeminarSpeakers: partner.portalSeminarSpeakers,
    portalTempPassword: partner.portalTempPassword,
    portalPasswordChangedAt: partner.portalPasswordChangedAt,
    portalPasswordPromptSkippedAt: partner.portalPasswordPromptSkippedAt,
    portalAuthVersion: partner.portalAuthVersion,
  };
}

export async function patchAdminPartner(
  id: string,
  patch: Partial<Partner>
): Promise<boolean> {
  try {
    const res = await fetch(`${ADMIN_API_URL}/api/partners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
