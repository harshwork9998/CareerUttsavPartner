import type {
  Partner,
  PartnerRepresentative,
  PartnerRepresentativesSubmission,
  SponsorshipTier,
  Event,
} from "@/lib/types";

/** Career Uttsav Admin — not this portal (portal is :3001). */
const ADMIN_API_URL =
  process.env.ADMIN_API_URL ??
  process.env.NEXT_PUBLIC_ADMIN_API_URL ??
  "http://localhost:3002";

type AdminPartnerRecord = Record<string, unknown>;

function normalizeRepresentativeRows(
  rows: unknown
): PartnerRepresentative[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const r = row as { name?: unknown; phone?: unknown };
    return {
      name: typeof r.name === "string" ? r.name : "",
      phone: typeof r.phone === "string" ? r.phone : "",
    };
  });
}

/** Accepts new per-event array or legacy single-object shape from Admin. */
export function normalizePortalRepresentatives(
  raw: unknown,
  eventIds: string[] = []
): PartnerRepresentativesSubmission[] | undefined {
  if (raw == null) return undefined;

  if (Array.isArray(raw)) {
    const rows = raw
      .map((item) => {
        const row = item as {
          eventId?: unknown;
          count?: unknown;
          representatives?: unknown;
          updatedAt?: unknown;
        };
        const eventId =
          typeof row.eventId === "string" ? row.eventId : "";
        if (!eventId) return null;
        return {
          eventId,
          count: Math.max(0, Math.floor(Number(row.count) || 0)),
          representatives: normalizeRepresentativeRows(row.representatives),
          updatedAt:
            typeof row.updatedAt === "string"
              ? row.updatedAt
              : new Date().toISOString(),
        } satisfies PartnerRepresentativesSubmission;
      })
      .filter((r): r is PartnerRepresentativesSubmission => r !== null);
    return rows.length > 0 ? rows : undefined;
  }

  // Legacy partner-level blob — attach to first linked event when possible.
  if (typeof raw === "object") {
    const legacy = raw as {
      count?: unknown;
      representatives?: unknown;
      updatedAt?: unknown;
      eventId?: unknown;
    };
    const eventId =
      typeof legacy.eventId === "string" && legacy.eventId
        ? legacy.eventId
        : eventIds[0] ?? "";
    if (!eventId) return undefined;
    return [
      {
        eventId,
        count: Math.max(0, Math.floor(Number(legacy.count) || 0)),
        representatives: normalizeRepresentativeRows(legacy.representatives),
        updatedAt:
          typeof legacy.updatedAt === "string"
            ? legacy.updatedAt
            : new Date().toISOString(),
      },
    ];
  }

  return undefined;
}

export function mapAdminPartnerToPortal(raw: AdminPartnerRecord): Partner | null {
  if (typeof raw.id !== "string" || typeof raw.name !== "string") return null;

  const eventIds = Array.isArray(raw.eventIds)
    ? raw.eventIds.filter((id): id is string => typeof id === "string")
    : [];

  return {
    id: raw.id,
    name: raw.name,
    city: typeof raw.city === "string" ? raw.city : "",
    state: typeof raw.state === "string" ? raw.state : "",
    eventIds,
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
    portalPasswordHash:
      typeof raw.portalPasswordHash === "string"
        ? raw.portalPasswordHash
        : undefined,
    hasPortalPassword:
      typeof raw.hasPortalPassword === "boolean"
        ? raw.hasPortalPassword
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
    portalRepresentatives: normalizePortalRepresentatives(
      raw.portalRepresentatives,
      eventIds
    ),
  };
}

export async function fetchAdminPartners(): Promise<Partner[]> {
  try {
    const res = await fetch(`${ADMIN_API_URL}/api/partners`, {
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(
        `[admin-api] GET /api/partners failed (${res.status}) from ${ADMIN_API_URL}`
      );
      return [];
    }
    const raw = (await res.json()) as AdminPartnerRecord[];
    return raw
      .map(mapAdminPartnerToPortal)
      .filter((partner): partner is Partner => {
        if (!partner) return false;
        // Activated once invite was sent OR credentials were issued in Admin.
        return Boolean(
          partner.portalInviteSentAt ||
            (partner.portalLogin &&
              (partner.hasPortalPassword ||
                partner.portalPasswordHash ||
                partner.portalTempPassword))
        );
      });
  } catch (error) {
    console.error(
      `[admin-api] Could not reach Admin at ${ADMIN_API_URL}/api/partners`,
      error
    );
    return [];
  }
}

export type AdminLoginPartner = {
  id: string;
  name: string;
  portalLogin?: string;
  portalInviteEmail?: string;
  portalInviteSentAt?: string;
  portalPasswordChangedAt?: string;
  portalAuthVersion?: number;
};

export type AdminLoginResult =
  | {
      ok: true;
      mustChangePassword: boolean;
      partner: AdminLoginPartner;
    }
  | {
      ok: false;
      status: number;
      error: string;
      code?: string;
      unreachable?: boolean;
    };

/** Authenticate against Admin partners store (Chapter 8 credentials). */
export async function loginAgainstAdmin(input: {
  login: string;
  password: string;
}): Promise<AdminLoginResult> {
  try {
    const res = await fetch(`${ADMIN_API_URL}/api/partner-portal/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login: input.login,
        password: input.password,
      }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      code?: string;
      mustChangePassword?: boolean;
      partner?: AdminLoginPartner;
    };

    if (!res.ok || !data.ok || !data.partner) {
      return {
        ok: false,
        status: res.status || 401,
        error:
          typeof data.error === "string"
            ? data.error
            : "Invalid login or password",
        code: data.code,
      };
    }

    return {
      ok: true,
      mustChangePassword: Boolean(data.mustChangePassword),
      partner: data.partner,
    };
  } catch (error) {
    console.error(
      `[admin-api] Could not reach Admin login at ${ADMIN_API_URL}`,
      error
    );
    return {
      ok: false,
      status: 503,
      error:
        "Could not reach Admin to verify partner credentials. Is Career Uttsav Admin running?",
      unreachable: true,
    };
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

/** Fields written by the partner portal — synced back to Admin after each save.
 * Never include credentials (hash/temp password) or portalAuthVersion — Admin
 * treats a different hash as a credential change and bumps authVersion, which
 * invalidates the current session cookie.
 */
export function pickPortalSyncPatch(partner: Partner): Partial<Partner> {
  return {
    portalDocuments: partner.portalDocuments,
    portalFasciaName: partner.portalFasciaName,
    portalWebsiteUrl: partner.portalWebsiteUrl,
    portalSmsContent: partner.portalSmsContent,
    portalSeminarSpeakers: partner.portalSeminarSpeakers,
    portalRepresentatives: partner.portalRepresentatives,
    portalPasswordChangedAt: partner.portalPasswordChangedAt,
    portalPasswordPromptSkippedAt: partner.portalPasswordPromptSkippedAt,
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
