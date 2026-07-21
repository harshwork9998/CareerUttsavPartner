import { cookies } from "next/headers";
import type { PortalSession } from "@/lib/types";

const COOKIE = "cu_partner_session";

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

export async function setSession(session: PortalSession) {
  const jar = await cookies();
  jar.set(COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
