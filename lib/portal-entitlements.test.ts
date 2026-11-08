import { describe, expect, it } from "vitest";

import { partnerPortalSubmissionEntitlements } from "@/lib/portal-entitlements";
import { submissionItemsForPartner } from "@/lib/partner-portal-docs";
import type { Partner } from "@/lib/types";

function partner(overrides: Partial<Partner> = {}): Partner {
  return {
    id: "partner-001",
    name: "Example U",
    city: "Bengaluru",
    state: "Karnataka",
    eventIds: ["evt-001"],
    stage: "Confirmed",
    eventPartnerships: [
      {
        eventId: "evt-001",
        deliverables: [
          {
            id: "writeup",
            key: "fullPageWriteup",
            label: "Write-up",
            included: true,
          },
        ],
        seminarSlotCount: 0,
        representativeSlotCount: 0,
      },
    ],
    seminarSlotAssignments: [],
    portalDocuments: [],
    ...overrides,
  } as Partner;
}

describe("Partner portal entitlements", () => {
  it("shows only the entitled submission cards", () => {
    expect(submissionItemsForPartner(partner()).map((item) => item.key)).toEqual([
      "fascia_name",
      "website_link",
      "souvenir_writeup",
    ]);
  });

  it("matches Admin-style entitlement output", () => {
    const status = partnerPortalSubmissionEntitlements({
      partnerships: partner().eventPartnerships ?? [],
      seminarSlotAssignments: [],
      portalFasciaName: "",
      portalWebsiteUrl: "",
      portalSmsContent: "",
      documents: [],
    });
    expect(status.logo.applicable).toBe(true);
    expect(status.souvenir_writeup.applicable).toBe(true);
    expect(status.ad_creative.applicable).toBe(false);
    expect(status.representatives.applicable).toBe(false);
  });
});
