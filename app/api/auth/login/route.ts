import { NextResponse } from "next/server";
import { getPartnerByLogin, mergeAdminPartners } from "@/lib/partner-store";
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

  await mergeAdminPartners();

  const partner = getPartnerByLogin(login);
  if (!partner?.portalInviteSentAt) {
    return NextResponse.json(
      { error: "Partner access has not been activated yet" },
      { status: 401 }
    );
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
      partner.portalLogin ?? partner.portalInviteEmail ?? login.toLowerCase(),
    mustChangePassword: !partner.portalPasswordChangedAt,
  });
}
