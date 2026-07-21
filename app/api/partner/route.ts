import { NextResponse } from "next/server";
import {
  getEvents,
  getPartnerById,
  setSeminarSpeakers,
  updatePartner,
  upsertPortalDocument,
} from "@/lib/partner-store";
import {
  buildEventPackageSummaries,
  resolveEventPartnerships,
} from "@/lib/partner-event-config";
import { getSession } from "@/lib/session";
import { getPartnerPortalUploadStatus } from "@/lib/partner-portal-docs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partner = getPartnerById(session.partnerId);
  if (!partner) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const events = getEvents();
  const partnerships = resolveEventPartnerships(partner);
  const packages = buildEventPackageSummaries(
    partnerships,
    partner.seminarSlotAssignments ?? [],
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
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const partner = getPartnerById(session.partnerId);
  if (!partner) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
    await import("@/lib/session").then(({ setSession }) =>
      setSession({ ...session, mustChangePassword: false })
    );
    return NextResponse.json({ ok: true });
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
    return NextResponse.json({ ok: true });
  }

  if (body.action === "seminar_speakers") {
    setSeminarSpeakers(
      partner.id,
      body.eventId,
      body.seminarId,
      body.speakers ?? []
    );
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
