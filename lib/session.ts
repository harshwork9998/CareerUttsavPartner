import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fetchAdminAuthState } from "@/lib/admin-api";
import { classifyPartnerSession, temporaryPasswordChangeRequired } from "@/lib/session-policy";
import type { PartnerSessionLookup } from "@/lib/session-policy";
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

export type SessionRead =
  | { status: "ok"; session: PortalSession }
  | { status: Exclude<PartnerSessionLookup["status"], "ok"> };

export async function readSession(): Promise<SessionRead> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return { status: "missing" };

  const decoded = decodeSession(raw);
  if (!decoded?.partnerId || !decoded?.login) return { status: "invalid" };

  const auth = await fetchAdminAuthState(decoded.partnerId);
  const verdict = classifyPartnerSession({
    hasCookie: true,
    auth: auth.ok
      ? {
          ok: true,
          portalAccessEnabled: auth.state.portalAccessEnabled,
          portalAuthVersion: auth.state.portalAuthVersion,
          portalLogin: auth.state.portalLogin,
        }
      : { ok: false, unreachable: auth.unreachable },
    sessionAuthVersion: decoded.authVersion ?? 0,
    sessionLogin: decoded.login,
  });
  if (verdict.status !== "ok" || !auth.ok) {
    return { status: verdict.status === "ok" ? "invalid" : verdict.status };
  }

  return {
    status: "ok",
    session: {
      ...decoded,
      authVersion: auth.state.portalAuthVersion,
      mustChangePassword: temporaryPasswordChangeRequired(
        auth.state.portalPasswordChangedAt
      ),
    },
  };
}

export async function getSession(): Promise<PortalSession | null> {
  const read = await readSession();
  return read.status === "ok" ? read.session : null;
}

export function sessionFailureResponse(status: Exclude<SessionRead["status"], "ok">) {
  if (status === "unavailable") {
    return NextResponse.json(
      { error: "Partner portal is temporarily unavailable. Please try again." },
      { status: 503, headers: { "x-cu-auth": "unavailable" } }
    );
  }
  if (status === "stale") {
    return NextResponse.json(
      { error: "Your session was updated. Refresh to continue." },
      { status: 401, headers: { "x-cu-auth": "stale" } }
    );
  }
  return withoutSession(
    NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "x-cu-auth": "invalid" } }
    )
  );
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
