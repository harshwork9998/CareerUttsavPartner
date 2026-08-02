import { NextResponse } from "next/server";
import { patchAdminPartner, pickPortalSyncPatch } from "@/lib/admin-api";
import {
  getEvents,
  getPartnerById,
  getPartnerByLogin,
  mergeAdminPartners,
  setSeminarSpeakers,
  updatePartner,
  upsertPortalDocument,
} from "@/lib/partner-store";
import {
  buildEventPackageSummaries,
  enrichSeminarSlotAssignments,
  resolveEventPartnerships,
} from "@/lib/partner-event-config";
import { getSession, withSession, withoutSession } from "@/lib/session";
import { getPartnerPortalUploadStatus } from "@/lib/partner-portal-docs";

function resolveSessionPartner(session: { partnerId: string; login: string }) {
  return (
    getPartnerById(session.partnerId) ?? getPartnerByLogin(session.login)
  );
}

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

    const partner = resolveSessionPartner(session);
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

    const { portalTempPassword: _pw, ...safePartner } = partner;

    return NextResponse.json({
      partner: safePartner,
      packages,
      events,
      uploadStatus: getPartnerPortalUploadStatus(partner),
      mustChangePassword: session.mustChangePassword,
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
  const partner = resolveSessionPartner(session);
  if (!partner) {
    return invalidSessionResponse();
  }

  if (body.action === "change_password") {
    const password = String(body.password ?? "");
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }
    updatePartner(partner.id, {
      portalTempPassword: password,
      portalPasswordChangedAt: new Date().toISOString(),
    });
    await syncPartnerPortalToAdmin(partner.id);
    return withSession(NextResponse.json({ ok: true }), {
      ...session,
      mustChangePassword: false,
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

  if (body.action === "seminar_speakers") {
    setSeminarSpeakers(
      partner.id,
      body.eventId,
      body.seminarId,
      body.speakers ?? []
    );
    await syncPartnerPortalToAdmin(partner.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
