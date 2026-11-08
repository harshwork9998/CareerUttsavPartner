import { NextResponse } from "next/server";

import { commitAdminPortalDocumentUpload } from "@/lib/admin-api";
import { updatePartner } from "@/lib/partner-store";
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
  const result = await commitAdminPortalDocumentUpload(auth.partner.id, kind, {
    label: String(body?.label ?? ""),
    fileName: String(body?.fileName ?? ""),
    mimeType: String(body?.mimeType ?? ""),
    fileSizeBytes: Number(body?.fileSizeBytes) || 0,
    storageBucket: String(body?.storageBucket ?? ""),
    storagePath: String(body?.storagePath ?? ""),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  updatePartner(auth.partner.id, {
    portalDocuments: result.partner.portalDocuments,
  });

  return NextResponse.json(result.partner);
}
