import { NextResponse } from "next/server";

import { commitAdminSpeakerPhotoUpload } from "@/lib/admin-api";
import { updatePartner } from "@/lib/partner-store";
import { requirePortalPartner } from "@/lib/portal-route-auth";

export async function POST(request: Request) {
  const auth = await requirePortalPartner();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const result = await commitAdminSpeakerPhotoUpload(auth.partner.id, {
    eventId: String(body?.eventId ?? ""),
    seminarId: String(body?.seminarId ?? ""),
    speakerId: String(body?.speakerId ?? ""),
    fileName: String(body?.fileName ?? ""),
    mimeType: String(body?.mimeType ?? ""),
    fileSizeBytes: Number(body?.fileSizeBytes) || 0,
    storageBucket: String(body?.storageBucket ?? ""),
    storagePath: String(body?.storagePath ?? ""),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (result.persisted) {
    updatePartner(auth.partner.id, {
      portalSeminarSpeakers: result.partner.portalSeminarSpeakers,
    });
  }

  return NextResponse.json({
    ...result.partner,
    persisted: result.persisted,
    speakerId: result.speakerId,
    storageBucket: result.storageBucket,
    storagePath: result.storagePath,
    mimeType: result.mimeType,
    fileSizeBytes: result.fileSizeBytes,
    fileName: result.fileName,
  });
}
