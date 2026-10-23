import { NextResponse } from "next/server";

import { loginAgainstAdmin } from "@/lib/admin-api";
import {
  LOGIN_ERROR,
  clearLoginFailures,
  clientIp,
  isLoginRateLimited,
  loginRateLimitKey,
  recordLoginFailure,
} from "@/lib/login-rate-limit";
import { mergeAdminPartners, upsertPartnerFromAdminAuth } from "@/lib/partner-store";
import { withSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    login?: string;
    password?: string;
  };
  const login = body.login?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const key = loginRateLimitKey(clientIp(request), login);

  if (isLoginRateLimited(key) || !login || password.length < 6) {
    if (!isLoginRateLimited(key)) recordLoginFailure(key);
    return NextResponse.json({ error: LOGIN_ERROR }, { status: 401 });
  }

  const adminAuth = await loginAgainstAdmin({
    login,
    password,
    clientIp: clientIp(request),
  });

  if (!adminAuth.ok && adminAuth.unreachable) {
    return NextResponse.json(
      {
        error:
          "Partner sign-in is temporarily unavailable. Please try again.",
      },
      { status: 503 }
    );
  }

  if (!adminAuth.ok) {
    recordLoginFailure(key);
    return NextResponse.json({ error: LOGIN_ERROR }, { status: 401 });
  }

  clearLoginFailures(key);
  await mergeAdminPartners();
  upsertPartnerFromAdminAuth({
    id: adminAuth.partner.id,
    name: adminAuth.partner.name || "Partner",
    portalLogin: adminAuth.partner.portalLogin ?? login,
    portalInviteEmail: adminAuth.partner.portalInviteEmail,
    portalInviteSentAt: adminAuth.partner.portalInviteSentAt,
    portalPasswordChangedAt: adminAuth.partner.portalPasswordChangedAt,
    portalAuthVersion: adminAuth.partner.portalAuthVersion ?? 0,
  });

  const response = NextResponse.json({
    ok: true,
    mustChangePassword: adminAuth.mustChangePassword,
  });

  return withSession(response, {
    partnerId: adminAuth.partner.id,
    login: (adminAuth.partner.portalLogin ?? login).toLowerCase(),
    mustChangePassword: adminAuth.mustChangePassword,
    authVersion: adminAuth.partner.portalAuthVersion ?? 0,
  });
}
