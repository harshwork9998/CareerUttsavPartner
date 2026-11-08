import { NextResponse } from "next/server";

import { getPartnerForSession, mergeAdminPartners } from "@/lib/partner-store";
import { readSession, sessionFailureResponse } from "@/lib/session";
import type { Partner, PortalSession } from "@/lib/types";

export async function requirePortalPartner(): Promise<
  | { ok: true; partner: Partner; session: PortalSession }
  | { ok: false; response: NextResponse }
> {
  await mergeAdminPartners();
  const read = await readSession();
  if (read.status !== "ok") {
    return { ok: false, response: sessionFailureResponse(read.status) };
  }
  const partner = getPartnerForSession(read.session);
  if (!partner) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, partner, session: read.session };
}
