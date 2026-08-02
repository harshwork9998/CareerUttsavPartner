import { NextResponse } from "next/server";
import { withoutSession } from "@/lib/session";

export async function POST() {
  return withoutSession(NextResponse.json({ ok: true }));
}
