import { describe, expect, it } from "vitest";

import { formatSeminarWhen } from "@/lib/partner-event-config";

describe("formatSeminarWhen", () => {
  it("renders TBD when seminar times are missing", () => {
    expect(
      formatSeminarWhen({
        date: "",
        startTime: "",
        endTime: "",
        hall: 0,
      })
    ).toContain("TBD");
  });
});
