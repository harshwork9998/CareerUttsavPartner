import type {
  Event,
  Partner,
  PartnerEventPartnership,
  PartnerSeminarSlotAssignment,
  EventPackageSummary,
} from "@/lib/types";

export function buildEventPackageSummaries(
  eventPartnerships: PartnerEventPartnership[],
  slotAssignments: PartnerSeminarSlotAssignment[],
  events: Event[]
): EventPackageSummary[] {
  const rows: EventPackageSummary[] = [];
  for (const ep of eventPartnerships) {
    const event = events.find((e) => e.id === ep.eventId);
    if (!event) continue;

    const seminars = slotAssignments
      .filter((a) => a.eventId === ep.eventId && a.slots > 0)
      .map((a) => {
        const seminar = event.seminars.find((s) => s.id === a.seminarId);
        return {
          id: a.seminarId,
          title: a.seminarTitle ?? seminar?.title ?? a.seminarId,
          slots: a.slots,
          date: seminar?.date ?? "",
          startTime: seminar?.startTime ?? "",
          endTime: seminar?.endTime ?? "",
          hall: seminar?.hall ?? 0,
        };
      });

    rows.push({
      eventId: ep.eventId,
      title: event.title,
      city: event.city,
      tier: ep.sponsorshipTier,
      deliverables: (ep.deliverables ?? [])
        .filter((d) => d.included)
        .map((d) => ({
          id: d.id,
          label: d.label,
          option: d.option,
        })),
      seminars,
      slotBudget: ep.seminarSlotCount ?? 0,
      seatsAssigned: seminars.reduce((s, row) => s + row.slots, 0),
    });
  }
  return rows;
}

export function enrichSeminarSlotAssignments(
  assignments: PartnerSeminarSlotAssignment[],
  events: Event[]
): PartnerSeminarSlotAssignment[] {
  return assignments.map((a) => {
    if (a.seminarTitle?.trim()) return a;
    const event = events.find((e) => e.id === a.eventId);
    const seminar = event?.seminars.find((s) => s.id === a.seminarId);
    return seminar?.title ? { ...a, seminarTitle: seminar.title } : a;
  });
}

export function resolveEventPartnerships(partner: Partner): PartnerEventPartnership[] {
  if (partner.eventPartnerships?.length) {
    return partner.eventPartnerships.map((ep) => ({
      ...ep,
      deliverables: (ep.deliverables ?? []).map((d) => ({ ...d })),
    }));
  }
  if (!partner.eventIds.length) return [];
  return partner.eventIds.map((eventId) => ({
    eventId,
    sponsorshipTier: partner.sponsorshipTier,
    deliverables: (partner.deliverables ?? []).map((d) => ({ ...d })),
    seminarSlotCount: 0,
  }));
}

export function formatSeminarWhen(seminar: {
  date: string;
  startTime: string;
  endTime: string;
  hall: number;
}) {
  const day = seminar.date
    ? new Date(seminar.date + "T12:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "";
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  };
  const time =
    seminar.startTime && seminar.endTime
      ? `${fmt(seminar.startTime)} – ${fmt(seminar.endTime)}`
      : "";
  const hall = seminar.hall ? `Hall ${seminar.hall}` : "";
  return [day, time, hall].filter(Boolean).join(" · ");
}
