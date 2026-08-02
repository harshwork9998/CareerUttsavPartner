import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { PortalSession } from "@/lib/types";

const COOKIE = "cu_partner_session";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export async function getSession(): Promise<PortalSession | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PortalSession;
  } catch {
    return null;
  }
}

/** Attach session on the response — required for Route Handlers. */
export function withSession(response: NextResponse, session: PortalSession) {
  response.cookies.set(COOKIE, JSON.stringify(session), cookieOptions);
  return response;
}

export function withoutSession(response: NextResponse) {
  response.cookies.set(COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
