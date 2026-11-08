import { NextResponse } from "next/server";

import { fetchAdminPortalDocumentUploadIntent } from "@/lib/admin-api";
import { requirePortalPartner } from "@/lib/portal-route-auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ kind: string }> }
) {
  const auth = await requirePortalPartner();
  if (!auth.ok) return auth.response;

  const { kind } = await context.params;
  if (kind !== "logo" && kind !== "souvenir_writeup") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const result = await fetchAdminPortalDocumentUploadIntent(auth.partner.id, kind, {
    fileName: String(body?.fileName ?? ""),
    mimeType: String(body?.mimeType ?? ""),
    fileSizeBytes: Number(body?.fileSizeBytes) || 0,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.intent);
}
