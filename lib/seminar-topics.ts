export const SEMINAR_FULL_MESSAGE = "This seminar is full.";

export type SeminarTopicChoice = {
  eventId: string;
  seminarId: string;
  title: string;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  hall: number | null;
  selected: boolean;
  locked: boolean;
  slots: number;
  remainingCapacity: number;
};

export type SeminarTopicEventGroup = {
  eventId: string;
  title: string;
  city: string;
  allocated: number;
  selected: number;
  remaining: number;
  topics: SeminarTopicChoice[];
};

export type PartnerSeminarTopicCatalog = {
  confirmedAt: string | null;
  fullyConfirmed: boolean;
  canConfirm: boolean;
  events: SeminarTopicEventGroup[];
};

/** The signed-in session owns the write. A partner id in the body is ignored. */
export function seminarTopicActorId(
  sessionPartnerId: string,
  body?: { partnerId?: unknown }
): string {
  void body?.partnerId;
  return sessionPartnerId;
}

export function seminarTopicFailureShouldRefresh(message: string): boolean {
  return message === SEMINAR_FULL_MESSAGE;
}
