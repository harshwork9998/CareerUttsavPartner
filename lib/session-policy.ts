export function temporaryPasswordChangeRequired(
  portalPasswordChangedAt: string | null | undefined
): boolean {
  return !portalPasswordChangedAt;
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
