import { NextResponse } from "next/server";

import { loginAgainstAdmin } from "@/lib/admin-api";
import {
  getPartnerById,
  getPartnerByLogin,
  mergeAdminPartners,
  updatePartner,
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

    let partner =
      getPartnerById(adminAuth.partner.id) ?? getPartnerByLogin(login);

    if (!partner) {
      partner = upsertPartnerFromAdminAuth({
        ...adminAuth.partner,
        portalTempPassword: password,
      });
    } else if (partner.portalTempPassword !== password) {
      partner =
        updatePartner(partner.id, {
          portalTempPassword: password,
          portalLogin:
            adminAuth.partner.portalLogin ?? partner.portalLogin ?? login,
          portalInviteEmail:
            adminAuth.partner.portalInviteEmail ?? partner.portalInviteEmail,
          portalInviteSentAt:
            adminAuth.partner.portalInviteSentAt ??
            partner.portalInviteSentAt ??
            new Date().toISOString(),
          portalPasswordChangedAt: adminAuth.partner.portalPasswordChangedAt,
          portalAuthVersion: adminAuth.partner.portalAuthVersion ?? 0,
        }) ?? partner;
    }

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
    if (!partner?.portalTempPassword) {
      return NextResponse.json({ error: adminAuth.error }, { status: 503 });
    }
    if (partner.portalTempPassword !== password) {
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
