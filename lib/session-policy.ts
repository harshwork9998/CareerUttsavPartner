export function temporaryPasswordChangeRequired(
  portalPasswordChangedAt: string | null | undefined
): boolean {
  return !portalPasswordChangedAt;
}

export type PartnerSessionLookup =
  | { status: "ok" }
  | { status: "missing" }
  | { status: "invalid" }
  | { status: "stale" }
  | { status: "unavailable" };

/** Classify a signed cookie against Admin auth-state without treating outages as logout. */
export function classifyPartnerSession(input: {
  hasCookie: boolean;
  auth:
    | {
        ok: true;
        portalAccessEnabled: boolean;
        portalAuthVersion: number;
        portalLogin: string;
      }
    | { ok: false; unreachable?: boolean };
  sessionAuthVersion: number;
  sessionLogin: string;
}): PartnerSessionLookup {
  if (!input.hasCookie) return { status: "missing" };
  if (!input.auth.ok) {
    return input.auth.unreachable ? { status: "unavailable" } : { status: "invalid" };
  }
  if (!input.auth.portalAccessEnabled) return { status: "invalid" };
  const login = input.auth.portalLogin.trim().toLowerCase();
  const sessionLogin = input.sessionLogin.trim().toLowerCase();
  if (!login || login !== sessionLogin) return { status: "invalid" };
  if (input.auth.portalAuthVersion !== input.sessionAuthVersion) {
    return { status: "stale" };
  }
  return { status: "ok" };
}

export function partnerSessionIsActive(input: {
  portalAccessEnabled: boolean;
  portalAuthVersion: number;
  portalLogin: string;
  sessionAuthVersion: number;
  sessionLogin: string;
}): boolean {
  if (!input.portalAccessEnabled) return false;
  if (input.portalAuthVersion !== input.sessionAuthVersion) return false;
  const login = input.portalLogin.trim().toLowerCase();
  const sessionLogin = input.sessionLogin.trim().toLowerCase();
  return Boolean(login) && login === sessionLogin;
}
