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

export function mergeRepresentativesPreservingHistory(
  existing: RepresentativeFields[] | undefined,
  allocation: number,
  submitted: RepresentativeFields[]
): RepresentativeFields[] {
  const prior = existing ?? [];
  const next = prior.map((row) => ({ ...row }));
  const visible = submitted.slice(0, allocation);
  for (let index = 0; index < visible.length; index += 1) {
    next[index] = visible[index];
  }
  return next;
}

export function partnerRepresentativeCountError(
  allocation: number,
  requestedCount: unknown
): string | null {
  const requested = Number(requestedCount);
  if (!Number.isInteger(requested) || requested !== allocation) {
    return "Representative allocation cannot be changed from the partner portal";
  }
  if (allocation < 1) {
    return "No event representative slots are allocated for this event";
  }
  return null;
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
