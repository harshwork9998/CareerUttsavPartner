import type { Event, Partner } from "@/lib/types";

export const SPEAKER_SEMINAR_NOT_ASSIGNED =
  "Speaker details can only be saved for an assigned seminar.";

export const SPEAKER_SEMINAR_WRONG_EVENT =
  "That seminar does not belong to this event.";

export function partnerSeminarSpeakerTargetError(input: {
  partner: Pick<Partner, "eventIds" | "eventPartnerships" | "seminarSlotAssignments">;
  events: Pick<Event, "id" | "seminars">[];
  eventId: string;
  seminarId: string;
}): string | null {
  const eventId = input.eventId.trim();
  const seminarId = input.seminarId.trim();
  if (!eventId || !seminarId) return SPEAKER_SEMINAR_NOT_ASSIGNED;

  const linked = new Set([
    ...(input.partner.eventIds ?? []),
    ...(input.partner.eventPartnerships ?? []).map((partnership) => partnership.eventId),
  ]);
  if (!linked.has(eventId)) return SPEAKER_SEMINAR_NOT_ASSIGNED;

  const event = input.events.find((candidate) => candidate.id === eventId);
  const seminar = event?.seminars.find((candidate) => candidate.id === seminarId);
  if (!seminar) return SPEAKER_SEMINAR_WRONG_EVENT;

  const assigned = (input.partner.seminarSlotAssignments ?? []).some(
    (assignment) =>
      assignment.eventId === eventId &&
      assignment.seminarId === seminarId &&
      assignment.slots > 0
  );
  if (!assigned) return SPEAKER_SEMINAR_NOT_ASSIGNED;
  return null;
}
