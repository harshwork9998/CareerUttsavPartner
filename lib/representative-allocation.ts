export type RepresentativeFields = {
  name: string;
  designation: string;
  phone: string;
};

export function parseRepresentativeSlotCount(
  value: unknown
): { ok: true; count: number } | { ok: false; error: string } {
  if (typeof value === "string" && value.trim() === "") {
    return { ok: true, count: 0 };
  }
  const count = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(count) || count < 0) {
    return {
      ok: false,
      error: "Event representative slots must be a whole number of 0 or more.",
    };
  }
  return { ok: true, count };
}

/**
 * Replace representatives inside the current allocation and keep any
 * previously stored rows beyond that maximum.
 */
export function mergeRepresentativesPreservingHistory(
  existing: RepresentativeFields[] | undefined,
  allocation: number,
  submitted: RepresentativeFields[]
): RepresentativeFields[] {
  const prior = existing ?? [];
  const maximum = Number.isInteger(allocation) && allocation > 0 ? allocation : 0;
  const visible = submitted
    .filter((row) => !isBlankRepresentative(row))
    .slice(0, maximum);
  return [...visible, ...prior.slice(maximum)];
}

export const REPRESENTATIVE_ROW_ERROR =
  "Enter a name, designation, and valid 10-digit mobile number for each representative";

export const REPRESENTATIVE_MAX_ERROR =
  "You cannot submit more representatives than the allocated maximum.";

export function isBlankRepresentative(row: {
  name?: string;
  designation?: string;
  phone?: string;
}): boolean {
  return (
    !String(row.name ?? "").trim() &&
    !String(row.designation ?? "").trim() &&
    !String(row.phone ?? "").trim()
  );
}

/** Allocation is a maximum. Counts from 0 through that maximum are allowed. */
export function partnerRepresentativeCountError(
  allocation: number,
  requestedCount: unknown
): string | null {
  const requested = Number(requestedCount);
  if (!Number.isInteger(requested) || requested < 0) {
    return "Representative allocation cannot be changed from the partner portal";
  }
  if (requested > allocation) return REPRESENTATIVE_MAX_ERROR;
  return null;
}

export function collectRepresentativeSubmission(
  rows: Array<{ name?: string; designation?: string; phone?: string }>,
  allocation: number,
  isValidPhone: (phone: string) => boolean
):
  | { ok: true; representatives: RepresentativeFields[] }
  | { ok: false; error: string } {
  const representatives: RepresentativeFields[] = [];
  for (const row of rows) {
    const name = String(row.name ?? "").trim();
    const designation = String(row.designation ?? "").trim();
    const phone = String(row.phone ?? "").trim();
    if (isBlankRepresentative({ name, designation, phone })) continue;
    if (!name || !designation || !phone || !isValidPhone(phone)) {
      return { ok: false, error: REPRESENTATIVE_ROW_ERROR };
    }
    representatives.push({ name, designation, phone });
  }
  const countError = partnerRepresentativeCountError(
    allocation,
    representatives.length
  );
  if (countError) return { ok: false, error: countError };
  return { ok: true, representatives };
}

/** Saved people, capped at the maximum. One blank row when nothing is saved. */
export function initialRepresentativeRows(
  allocation: number,
  saved: Array<{ name?: string; designation?: string; phone?: string }> | undefined
): RepresentativeFields[] {
  const maximum = Number.isInteger(allocation) && allocation > 0 ? allocation : 0;
  if (maximum < 1) return [];
  const filled = (saved ?? [])
    .filter((row) => !isBlankRepresentative(row))
    .slice(0, maximum)
    .map((row) => ({
      name: String(row.name ?? ""),
      designation: String(row.designation ?? ""),
      phone: String(row.phone ?? ""),
    }));
  if (filled.length === 0) return [{ name: "", designation: "", phone: "" }];
  return filled;
}

export function canAddRepresentative(
  currentRows: number,
  allocation: number
): boolean {
  return Number.isInteger(allocation) && currentRows < allocation;
}

export function representativeFormCount(
  allocation: number | null | undefined
): number {
  if (
    typeof allocation !== "number" ||
    !Number.isInteger(allocation) ||
    allocation < 1
  ) {
    return 0;
  }
  return allocation;
}

export function representativeAllocationForEvent(
  partnerships: Array<{
    eventId: string;
    representativeSlotCount?: number | null;
  }> | undefined,
  eventId: string
): number {
  const raw = partnerships?.find((row) => row.eventId === eventId)
    ?.representativeSlotCount;
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0) return 0;
  return raw;
}
