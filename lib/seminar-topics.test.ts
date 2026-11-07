import { describe, expect, it } from "vitest";

import {
  SEMINAR_FULL_MESSAGE,
  seminarTopicActorId,
  seminarTopicFailureShouldRefresh,
} from "@/lib/seminar-topics";

describe("partner seminar topic requests", () => {
  it("uses the signed-in partner and ignores a partner id in the body", () => {
    expect(
      seminarTopicActorId("partner-a", { partnerId: "partner-b" })
    ).toBe("partner-a");
  });

  it("asks the catalog to refresh when a seminar is full", () => {
    expect(seminarTopicFailureShouldRefresh(SEMINAR_FULL_MESSAGE)).toBe(true);
    expect(seminarTopicFailureShouldRefresh("Select every allocated seminar topic before confirming.")).toBe(
      false
    );
  });
});
