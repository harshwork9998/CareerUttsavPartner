import { NextResponse } from "next/server";

import { commitAdminAdCreativeUpload } from "@/lib/admin-api";
import {
  getPartnerForSession,
  mergeAdminPartners,
  updatePartner,
} from "@/lib/partner-store";
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
  const result = await commitAdminAdCreativeUpload(partner.id, {
    label: String(body?.label ?? "Advertisement creative"),
    fileName: String(body?.fileName ?? ""),
    mimeType: String(body?.mimeType ?? ""),
    fileSizeBytes: Number(body?.fileSizeBytes) || 0,
    storageBucket: String(body?.storageBucket ?? ""),
    storagePath: String(body?.storagePath ?? ""),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  updatePartner(partner.id, {
    portalDocuments: result.partner.portalDocuments,
  });

  return NextResponse.json(result.partner);
}
