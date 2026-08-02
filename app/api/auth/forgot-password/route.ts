import { NextResponse } from "next/server";
import { getPartnerByLogin, mergeAdminPartners } from "@/lib/partner-store";
import { buildResetPasswordUrl, sendPasswordResetEmail } from "@/lib/mail";
import { allowRequest, clientKey } from "@/lib/rate-limit";
import { createResetToken } from "@/lib/reset-tokens";

const GENERIC_MESSAGE =
  "If an account exists for this email, password reset instructions have been sent.";

export async function POST(request: Request) {
  let body: { email?: string } = {};
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  const email = body.email?.trim().toLowerCase() ?? "";

  // Always return the same shape — never reveal whether the email exists.
  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  if (!allowRequest(clientKey(request, email), 5, 15 * 60 * 1000)) {
    // Still generic, but with 429 so clients can back off politely
    return NextResponse.json(
      { ok: true, message: GENERIC_MESSAGE },
      { status: 429 }
    );
  }

  // Constant-ish delay to reduce timing oracles
  const delay = new Promise((r) => setTimeout(r, 400 + Math.random() * 350));

  await mergeAdminPartners();
  const partner = getPartnerByLogin(email);

  if (partner?.portalInviteSentAt) {
    const token = createResetToken(
      partner.id,
      partner.portalLogin ?? partner.portalInviteEmail ?? email
    );
    const resetUrl = buildResetPasswordUrl(token);
    await sendPasswordResetEmail({
      to: partner.portalInviteEmail ?? partner.portalLogin ?? email,
      resetUrl,
    });
  }

  await delay;
  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
