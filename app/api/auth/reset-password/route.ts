import { NextResponse } from "next/server";
import { patchAdminPartner } from "@/lib/admin-api";
import { hashPartnerPassword } from "@/lib/partner-password";
import {
  bumpPartnerAuthVersion,
  getPartnerById,
  updatePartner,
} from "@/lib/partner-store";
import { allowRequest, clientKey } from "@/lib/rate-limit";
import { consumeResetToken, peekResetToken } from "@/lib/reset-tokens";
import { withoutSession } from "@/lib/session";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!token || !peekResetToken(token)) {
    return NextResponse.json(
      { valid: false, error: "This reset link is invalid or has expired." },
      { status: 400 }
    );
  }
  return NextResponse.json({ valid: true });
}

export async function POST(request: Request) {
  if (!allowRequest(clientKey(request, "reset"), 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  const body = (await request.json()) as {
    token?: string;
    password?: string;
  };
  const token = body.token?.trim() ?? "";
  const password = body.password ?? "";

  if (!token) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const record = consumeResetToken(token);
  if (!record) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 }
    );
  }

  const partner = getPartnerById(record.partnerId);
  if (!partner) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 }
    );
  }

  const changedAt = new Date().toISOString();
  updatePartner(partner.id, {
    portalPasswordHash: hashPartnerPassword(password),
    portalTempPassword: undefined,
    portalPasswordChangedAt: changedAt,
  });
  const bumped = bumpPartnerAuthVersion(partner.id);

  await patchAdminPartner(partner.id, {
    portalTempPassword: password,
    portalPasswordChangedAt: changedAt,
    portalAuthVersion: bumped?.portalAuthVersion,
  });

  // Clear any cookie on this browser and invalidate others via authVersion bump
  return withoutSession(
    NextResponse.json({
      ok: true,
      message: "Your password has been reset successfully. Please sign in.",
    })
  );
}
