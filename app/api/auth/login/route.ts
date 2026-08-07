import { NextResponse } from "next/server";

import { loginAgainstAdmin } from "@/lib/admin-api";
import {
  partnerHasStoredPassword,
  verifyPartnerStoredPassword,
} from "@/lib/partner-password";
import {
  getPartnerById,
  getPartnerByLogin,
  mergeAdminPartners,
  upsertPartnerFromAdminAuth,
} from "@/lib/partner-store";
import { withSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as { login?: string; password?: string };
  const login = body.login?.trim() ?? "";
  const password = body.password ?? "";

  if (!login || password.length < 6) {
    return NextResponse.json(
      { error: "Invalid login or password" },
      { status: 401 }
    );
  }

  // Prefer Admin as source of truth for Chapter 8 credentials.
  const adminAuth = await loginAgainstAdmin({ login, password });
  if (adminAuth.ok) {
    await mergeAdminPartners();

    const existing =
      getPartnerById(adminAuth.partner.id) ?? getPartnerByLogin(login);

    // Cache a local hash of the verified password for offline fallback — never plaintext.
    const partner = upsertPartnerFromAdminAuth({
      id: adminAuth.partner.id,
      name: adminAuth.partner.name || existing?.name || "Partner",
      portalLogin:
        adminAuth.partner.portalLogin ?? existing?.portalLogin ?? login,
      portalInviteEmail:
        adminAuth.partner.portalInviteEmail ?? existing?.portalInviteEmail,
      portalInviteSentAt:
        adminAuth.partner.portalInviteSentAt ??
        existing?.portalInviteSentAt ??
        new Date().toISOString(),
      portalPasswordChangedAt: adminAuth.partner.portalPasswordChangedAt,
      portalAuthVersion: adminAuth.partner.portalAuthVersion ?? 0,
      portalPassword: password,
    });

    const response = NextResponse.json({
      ok: true,
      mustChangePassword: adminAuth.mustChangePassword,
    });

    return withSession(response, {
      partnerId: partner.id,
      login:
        partner.portalLogin ??
        partner.portalInviteEmail ??
        login.toLowerCase(),
      mustChangePassword: adminAuth.mustChangePassword,
      authVersion: partner.portalAuthVersion ?? 0,
    });
  }

  if (adminAuth.unreachable) {
    // Fall back to local/seed only when Admin is unreachable (offline demo).
    await mergeAdminPartners();
    const partner = getPartnerByLogin(login);
    if (!partner || !partnerHasStoredPassword(partner)) {
      return NextResponse.json({ error: adminAuth.error }, { status: 503 });
    }
    if (!verifyPartnerStoredPassword(partner, password)) {
      return NextResponse.json(
        { error: "Invalid login or password" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      mustChangePassword: !partner.portalPasswordChangedAt,
    });
    return withSession(response, {
      partnerId: partner.id,
      login:
        partner.portalLogin ??
        partner.portalInviteEmail ??
        login.toLowerCase(),
      mustChangePassword: !partner.portalPasswordChangedAt,
      authVersion: partner.portalAuthVersion ?? 0,
    });
  }

  return NextResponse.json(
    { error: adminAuth.error },
    { status: adminAuth.status || 401 }
  );
}
