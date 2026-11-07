import { describe, expect, it } from "vitest";

import {
  SPEAKER_SEMINAR_NOT_ASSIGNED,
  SPEAKER_SEMINAR_WRONG_EVENT,
  partnerSeminarSpeakerTargetError,
} from "@/lib/seminar-speaker-guard";
import type { Event, Partner } from "@/lib/types";

const events = [
  {
    id: "evt-001",
    seminars: [{ id: "sem-a", title: "Design", date: "", startTime: "", endTime: "", hall: 1 }],
  },
  {
    id: "evt-002",
    seminars: [{ id: "sem-b", title: "Media", date: "", startTime: "", endTime: "", hall: 1 }],
  },
] as Event[];

function partner(assignments: Partner["seminarSlotAssignments"]): Pick<
  Partner,
  "eventIds" | "eventPartnerships" | "seminarSlotAssignments"
> {
  return {
    eventIds: ["evt-001"],
    eventPartnerships: [
      { eventId: "evt-001", deliverables: [], seminarSlotCount: 1 },
    ],
    seminarSlotAssignments: assignments,
  };
}

describe("partner seminar speaker target", () => {
  it("allows speaker details for an assigned seminar", () => {
    expect(
      partnerSeminarSpeakerTargetError({
        partner: partner([
          { eventId: "evt-001", seminarId: "sem-a", slots: 1 },
        ]),
        events,
        eventId: "evt-001",
        seminarId: "sem-a",
      })
    ).toBeNull();
  });

  it("rejects an unassigned seminar", () => {
    expect(
      partnerSeminarSpeakerTargetError({
        partner: partner([]),
        events,
        eventId: "evt-001",
        seminarId: "sem-a",
      })
    ).toBe(SPEAKER_SEMINAR_NOT_ASSIGNED);
  });

  it("rejects a seminar that belongs to another event", () => {
    expect(
      partnerSeminarSpeakerTargetError({
        partner: partner([
          { eventId: "evt-001", seminarId: "sem-b", slots: 1 },
        ]),
        events,
        eventId: "evt-001",
        seminarId: "sem-b",
      })
    ).toBe(SPEAKER_SEMINAR_WRONG_EVENT);
  });
});
