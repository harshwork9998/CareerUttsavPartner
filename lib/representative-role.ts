export const REPRESENTATIVE_ROLE_OPTIONS = [
  "Leadership / Management",
  "Admissions / Marketing",
  "Speaker / Expert",
  "Support Staff (Driver, Office Assistant, etc.)",
] as const;

export type RepresentativeRole = (typeof REPRESENTATIVE_ROLE_OPTIONS)[number];

const ROLE_SET = new Set<string>(REPRESENTATIVE_ROLE_OPTIONS);
/** @deprecated Saved before label rename; still accepted on validation. */
const LEGACY_REPRESENTATIVE_ROLES = new Set(["Speaker"]);

export const INVALID_REPRESENTATIVE_ROLE_MESSAGE =
  "Select a valid Representative Role from the list.";

export function isAllowedRepresentativeRole(value: string | undefined | null): boolean {
  const trimmed = String(value ?? "").trim();
  return ROLE_SET.has(trimmed) || LEGACY_REPRESENTATIVE_ROLES.has(trimmed);
}

export function validateRepresentativeRole(value: string): string | null {
  return isAllowedRepresentativeRole(value) ? null : INVALID_REPRESENTATIVE_ROLE_MESSAGE;
}
