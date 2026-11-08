import { NextResponse } from "next/server";

import {
  fetchAdminAdCreativeUploadIntent,
} from "@/lib/admin-api";
import { getPartnerForSession, mergeAdminPartners } from "@/lib/partner-store";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  await mergeAdminPartners();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const partner = getPartnerForSession(session);
  if (!partner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const result = await fetchAdminAdCreativeUploadIntent(partner.id, {
    fileName: String(body?.fileName ?? ""),
    mimeType: String(body?.mimeType ?? ""),
    fileSizeBytes: Number(body?.fileSizeBytes) || 0,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.intent);
}
