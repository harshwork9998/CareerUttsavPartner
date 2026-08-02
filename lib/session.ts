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

function encodeSession(session: PortalSession): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

function decodeSession(raw: string): PortalSession | null {
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    return JSON.parse(json) as PortalSession;
  } catch {
    try {
      return JSON.parse(raw) as PortalSession;
    } catch {
      return null;
    }
  }
}

export async function getSession(): Promise<PortalSession | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const session = decodeSession(raw);
  if (!session?.partnerId || !session?.login) return null;

  // Reject sessions issued before a password change/reset
  const { getPartnerById } = await import("@/lib/partner-store");
  const partner = getPartnerById(session.partnerId);
  if (!partner) return null;
  const currentVersion = partner.portalAuthVersion ?? 0;
  if ((session.authVersion ?? 0) !== currentVersion) return null;

  return session;
}

/** Attach session on the response — required for Route Handlers. */
export function withSession(response: NextResponse, session: PortalSession) {
  response.cookies.set(COOKIE, encodeSession(session), cookieOptions);
  return response;
}

export function withoutSession(response: NextResponse) {
  response.cookies.set(COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
