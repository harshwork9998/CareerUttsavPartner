import { NextResponse } from "next/server";

import { fetchAdminSpeakerPhotoAccessUrl } from "@/lib/admin-api";
import { requirePortalPartner } from "@/lib/portal-route-auth";

export async function GET(request: Request) {
  const auth = await requirePortalPartner();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId")?.trim() ?? "";
  const seminarId = url.searchParams.get("seminarId")?.trim() ?? "";
  const speakerId = url.searchParams.get("speakerId")?.trim() ?? "";
  if (!eventId || !seminarId || !speakerId) {
    return NextResponse.json({ error: "Invalid speaker photo." }, { status: 400 });
  }

  const result = await fetchAdminSpeakerPhotoAccessUrl(auth.partner.id, {
    eventId,
    seminarId,
    speakerId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ url: result.url });
}
