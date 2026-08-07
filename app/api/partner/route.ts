import { NextResponse } from "next/server";
import { patchAdminPartner, pickPortalSyncPatch } from "@/lib/admin-api";
import { hashPartnerPassword } from "@/lib/partner-password";
import {
  getEvents,
  getPartnerById,
  getPartnerForSession,
  bumpPartnerAuthVersion,
  mergeAdminPartners,
  setRepresentatives,
  setSeminarSpeakers,
  updatePartner,
  upsertPortalDocument,
  removePortalDocument,
} from "@/lib/partner-store";
import {
  buildEventPackageSummaries,
  enrichSeminarSlotAssignments,
  resolveEventPartnerships,
} from "@/lib/partner-event-config";
import { getSession, withSession, withoutSession } from "@/lib/session";
import { getPartnerPortalUploadStatus } from "@/lib/partner-portal-docs";
import { isValidIndianMobile, normalizeIndianMobile } from "@/lib/phone";
import type { PartnerPortalDocument } from "@/lib/types";

function invalidSessionResponse() {
  // Clear the cookie so /login does not bounce straight back to /dashboard.
  return withoutSession(
    NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  );
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await mergeAdminPartners();

    const partner = getPartnerForSession(session);
    if (!partner) {
      return invalidSessionResponse();
    }

    const events = getEvents();
    const partnerships = resolveEventPartnerships(partner);
    const slotAssignments = enrichSeminarSlotAssignments(
      partner.seminarSlotAssignments ?? [],
      events
    );
    const packages = buildEventPackageSummaries(
      partnerships,
      slotAssignments,
      events
    );

    const {
    portalTempPassword: _pw,
    portalPasswordHash: _hash,
    ...safePartner
  } = partner;

    return NextResponse.json({
      partner: safePartner,
      packages,
      events,
      uploadStatus: getPartnerPortalUploadStatus(partner),
      mustChangePassword: !partner.portalPasswordChangedAt,
      forcePasswordPrompt:
        !partner.portalPasswordChangedAt &&
        !partner.portalPasswordPromptSkippedAt,
    });
  } catch (err) {
    console.error("[api/partner GET]", err);
    return NextResponse.json(
      { error: "Failed to load partner dashboard" },
      { status: 500 }
    );
  }
}

async function syncPartnerPortalToAdmin(partnerId: string) {
  const partner = getPartnerById(partnerId);
  if (!partner) return;
  await patchAdminPartner(partner.id, pickPortalSyncPatch(partner));
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const partner = getPartnerForSession(session);
  if (!partner) {
    return invalidSessionResponse();
  }

  if (body.action === "skip_password_prompt") {
    if (!partner.portalPasswordChangedAt) {
      updatePartner(partner.id, {
        portalPasswordPromptSkippedAt: new Date().toISOString(),
      });
      await syncPartnerPortalToAdmin(partner.id);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "change_password") {
    const password = String(body.password ?? "");
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }
    // Hash locally; sync plaintext once to Admin so Admin can re-hash & store.
    updatePartner(partner.id, {
      portalPasswordHash: hashPartnerPassword(password),
      portalTempPassword: undefined,
      portalPasswordChangedAt: new Date().toISOString(),
    });
    const bumped = bumpPartnerAuthVersion(partner.id);
    await patchAdminPartner(partner.id, {
      portalTempPassword: password,
      portalPasswordChangedAt: new Date().toISOString(),
      portalAuthVersion: bumped?.portalAuthVersion,
    });
    return withSession(NextResponse.json({ ok: true }), {
      ...session,
      mustChangePassword: false,
      authVersion: bumped?.portalAuthVersion ?? (session.authVersion ?? 0) + 1,
    });
  }

  if (body.action === "text_field") {
    const field = body.field as
      | "portalFasciaName"
      | "portalWebsiteUrl"
      | "portalSmsContent";
    if (!field) {
      return NextResponse.json({ error: "Invalid field" }, { status: 400 });
    }
    updatePartner(partner.id, { [field]: String(body.value ?? "") });
    await syncPartnerPortalToAdmin(partner.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "upload_document") {
    const { kind, label, fileName, mimeType, url, fileSizeBytes } = body;
    upsertPortalDocument(partner.id, {
      kind,
      label,
      fileName,
      mimeType,
      url,
      fileSizeBytes: Number(fileSizeBytes) || 0,
    });
    await syncPartnerPortalToAdmin(partner.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "remove_document") {
    const kind = body.kind as PartnerPortalDocument["kind"] | undefined;
    if (!kind) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    removePortalDocument(partner.id, kind);
    await syncPartnerPortalToAdmin(partner.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "seminar_speakers") {
    const speakers = (Array.isArray(body.speakers) ? body.speakers : []).map(
      (s: {
        name?: string;
        designation?: string;
        contact?: string;
        introduction?: string;
        photoUrl?: string;
      }) => ({
        ...s,
        name: String(s.name ?? "").trim(),
        designation: String(s.designation ?? "").trim(),
        contact: normalizeIndianMobile(String(s.contact ?? "")),
        introduction: String(s.introduction ?? "").trim(),
        photoUrl: String(s.photoUrl ?? "").trim(),
      })
    );

    if (
      speakers.length === 0 ||
      speakers.some(
        (s: { name: string; designation: string; contact: string; introduction: string; photoUrl: string }) =>
          !s.name ||
          !s.designation ||
          !isValidIndianMobile(s.contact) ||
          !s.introduction ||
          !s.photoUrl
      )
    ) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit mobile number for each speaker" },
        { status: 400 }
      );
    }

    setSeminarSpeakers(
      partner.id,
      body.eventId,
      body.seminarId,
      speakers
    );
    await syncPartnerPortalToAdmin(partner.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "representatives") {
    const eventId = String(body.eventId ?? "").trim();
    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    const linkedEventIds = new Set(
      [
        ...(partner.eventIds ?? []),
        ...(partner.eventPartnerships ?? []).map((p) => p.eventId),
      ].filter(Boolean)
    );
    if (linkedEventIds.size > 0 && !linkedEventIds.has(eventId)) {
      return NextResponse.json(
        { error: "Event is not linked to this partner" },
        { status: 400 }
      );
    }

    const count = Math.max(0, Math.floor(Number(body.count) || 0));
    const rows = (
      Array.isArray(body.representatives) ? body.representatives : []
    ) as Array<{ name?: string; phone?: string }>;
    const representatives: Array<{ name: string; phone: string }> = rows
      .slice(0, count)
      .map((row) => ({
        name: String(row.name ?? "").trim(),
        phone: normalizeIndianMobile(String(row.phone ?? "")),
      }));

    if (
      count < 1 ||
      representatives.length !== count ||
      representatives.some(
        (r) => !r.name || !isValidIndianMobile(r.phone)
      )
    ) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit mobile number for each representative" },
        { status: 400 }
      );
    }

    setRepresentatives(partner.id, eventId, count, representatives);
    await syncPartnerPortalToAdmin(partner.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
