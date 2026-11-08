import { NextResponse } from "next/server";

import { fetchAdminSpeakerPhotoUploadIntent } from "@/lib/admin-api";
import { requirePortalPartner } from "@/lib/portal-route-auth";

export async function POST(request: Request) {
  const auth = await requirePortalPartner();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const result = await fetchAdminSpeakerPhotoUploadIntent(auth.partner.id, {
    eventId: String(body?.eventId ?? ""),
    seminarId: String(body?.seminarId ?? ""),
    speakerId: String(body?.speakerId ?? ""),
    fileName: String(body?.fileName ?? ""),
    mimeType: String(body?.mimeType ?? ""),
    fileSizeBytes: Number(body?.fileSizeBytes) || 0,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.intent);
}
