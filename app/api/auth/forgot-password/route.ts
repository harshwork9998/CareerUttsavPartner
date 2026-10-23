import { NextResponse } from "next/server";

import { requestAdminPasswordReset } from "@/lib/admin-api";
import { allowRequest, clientKey } from "@/lib/rate-limit";

const GENERIC_MESSAGE =
  "If an account exists, password reset instructions have been sent.";

export async function POST(request: Request) {
  let body: { email?: string } = {};
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  if (!allowRequest(clientKey(request, email), 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { ok: true, message: GENERIC_MESSAGE },
      { status: 429 }
    );
  }

  await requestAdminPasswordReset(email);
  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
