import { NextResponse } from "next/server";

import {
  completeAdminPasswordReset,
  previewAdminPasswordReset,
} from "@/lib/admin-api";
import { allowRequest, clientKey } from "@/lib/rate-limit";
import { withoutSession } from "@/lib/session";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  const valid = token ? await previewAdminPasswordReset(token) : false;
  if (!valid) {
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

  const body = (await request.json().catch(() => ({}))) as {
    token?: string;
    password?: string;
  };
  const result = await completeAdminPasswordReset({
    token: body.token?.trim() ?? "",
    password: body.password ?? "",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return withoutSession(
    NextResponse.json({
      ok: true,
      message: "Your password has been reset successfully. Please sign in.",
    })
  );
}
