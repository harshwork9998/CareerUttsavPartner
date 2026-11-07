import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SeminarSection } from "@/features/dashboard/seminar-section";
import type { PartnerSeminarTopicCatalog } from "@/lib/seminar-topics";
import type { EventPackageSummary } from "@/lib/types";

const catalog: PartnerSeminarTopicCatalog = {
  confirmedAt: null,
  fullyConfirmed: false,
  canConfirm: false,
  events: [
    {
      eventId: "evt-001",
      title: "Bengaluru",
      city: "Bengaluru",
      allocated: 2,
      selected: 1,
      remaining: 1,
      topics: [
        {
          eventId: "evt-001",
          seminarId: "sem-a",
          title: "Design careers",
          date: "2026-12-19",
          startTime: "10:00",
          endTime: "11:00",
          hall: 2,
          selected: true,
          locked: false,
        },
        {
          eventId: "evt-001",
          seminarId: "sem-b",
          title: "Scholarships",
          date: "2026-12-19",
          startTime: "12:00",
          endTime: "13:00",
          hall: 1,
          selected: false,
          locked: false,
        },
      ],
    },
  ],
};

describe("partner seminar topic cards", () => {
  it("shows the topic and the partner's own allocation without seminar capacity", () => {
    const html = renderToStaticMarkup(
      createElement(SeminarSection, {
        packages: [{ slotBudget: 2 } as EventPackageSummary],
        catalog,
      })
    );
    expect(html).toContain("Design careers");
    expect(html).toContain("Scholarships");
    expect(html).toContain("Hall 2");
    expect(html).toContain("Allocated: 2");
    expect(html).toContain("Selected: 1");
    expect(html).toContain("Remaining: 1");
    expect(html).toContain("1 of 2 topics selected");
    expect(html).toContain(">Selected<");
    expect(html).not.toMatch(/remainingCapacity|panelistSlots|seats left|of \d+ seats/i);
  });
});
