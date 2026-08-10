import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { PortalSession } from "@/lib/types";

const COOKIE = "cu_partner_session";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not configured. Set SESSION_SECRET to a long random string (server-side only) before signing or verifying partner sessions."
    );
  }
  return secret;
}

function signPayload(payloadB64: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(payloadB64)
    .digest("base64url");
}

function signaturesMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Cookie value: base64url(payload).base64url(hmac-sha256) */
function encodeSession(session: PortalSession): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString(
    "base64url"
  );
  return `${payload}.${signPayload(payload)}`;
}

/**
 * Verify HMAC before decoding. Rejects unsigned, malformed, or tampered cookies.
 * Does not accept the legacy unsigned base64 format.
 */
function decodeSession(raw: string): PortalSession | null {
  try {
    const separator = raw.indexOf(".");
    if (separator <= 0 || separator !== raw.lastIndexOf(".")) return null;

    const payload = raw.slice(0, separator);
    const signature = raw.slice(separator + 1);
    if (!payload || !signature) return null;

    const expected = signPayload(payload);
    if (!signaturesMatch(signature, expected)) return null;

    const json = Buffer.from(payload, "base64url").toString("utf8");
    const session = JSON.parse(json) as PortalSession;
    if (!session || typeof session !== "object") return null;
    return session;
  } catch (err) {
    // Configuration errors must surface; parse/verify failures stay unauthenticated.
    if (
      err instanceof Error &&
      err.message.startsWith("SESSION_SECRET is not configured")
    ) {
      throw err;
    }
    return null;
  }
}

export async function getSession(): Promise<PortalSession | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;

  const session = decodeSession(raw);
  if (!session?.partnerId || !session?.login) return null;

  // Reject sessions issued before a password change/reset, and reject if the
  // cookie's login no longer belongs to that partnerId (prevents cross-tenant).
  const { getPartnerForSession } = await import("@/lib/partner-store");
  const partner = getPartnerForSession(session);
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
