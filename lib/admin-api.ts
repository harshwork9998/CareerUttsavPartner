import type { Partner, SponsorshipTier } from "@/lib/types";

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
