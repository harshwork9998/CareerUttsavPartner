import { NextResponse } from "next/server";

import { fetchAdminPortalDocumentAccessUrl } from "@/lib/admin-api";
import { getPartnerForSession, mergeAdminPartners } from "@/lib/partner-store";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  await mergeAdminPartners();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const partner = getPartnerForSession(session);
  if (!partner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kind = new URL(request.url).searchParams.get("kind")?.trim() ?? "";
  if (!kind) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const result = await fetchAdminPortalDocumentAccessUrl(partner.id, kind);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ url: result.url });
}
