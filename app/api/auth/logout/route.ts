import { NextResponse } from "next/server";
import { withoutSession } from "@/lib/session";

export async function POST() {
  return withoutSession(NextResponse.json({ ok: true }));
}

/** Browser-friendly clear: used when a stale session must be dropped. */
export async function GET(request: Request) {
  return withoutSession(NextResponse.redirect(new URL("/login", request.url)));
}
