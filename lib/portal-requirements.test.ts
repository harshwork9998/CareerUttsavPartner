import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  deliverableOptionLabel,
  partnerFacingCopy,
} from "@/lib/deliverable-labels";
import { validateLinkedInProfile } from "@/lib/linkedin-profile";
import { isValidIndianMobile } from "@/lib/phone";
import { hasAllocatedPanelSlots } from "@/lib/panel-discussion-visibility";
import {
  canAddRepresentative,
  collectRepresentativeSubmission,
  initialRepresentativeRows,
  mergeRepresentativesPreservingHistory,
  partnerRepresentativeCountError,
  representativeAllocationForEvent,
  representativeFormCount,
} from "@/lib/representative-allocation";
import {
  SMS_CONTENT_MAX_LENGTH,
  SMS_CONTENT_TOO_LONG_MESSAGE,
  validateSmsContent,
} from "@/lib/sms-content";
import {
  MAX_UPLOAD_BYTES,
  OVERSIZE_FILE_MESSAGE,
  PORTAL_UPLOAD_ACCEPT,
  UNSUPPORTED_FILE_MESSAGE,
  validateUploadFile,
} from "@/lib/upload-policy";

const root = path.resolve(__dirname, "..");

describe("representative allocation", () => {
  it("reads the admin allocation and rejects an independent partner count", () => {
    const partnerships = [
      {
        eventId: "evt-001",
        seminarSlotCount: 2,
        representativeSlotCount: 3,
        deliverables: [],
      },
    ];
    expect(representativeAllocationForEvent(partnerships, "evt-001")).toBe(3);
    expect(representativeAllocationForEvent(partnerships, "missing")).toBe(0);
    expect(representativeAllocationForEvent(undefined, "evt-001")).toBe(0);
    expect(partnerRepresentativeCountError(3, 0)).toBeNull();
    expect(partnerRepresentativeCountError(3, 1)).toBeNull();
    expect(partnerRepresentativeCountError(3, 2)).toBeNull();
    expect(partnerRepresentativeCountError(3, 3)).toBeNull();
    expect(partnerRepresentativeCountError(3, 4)).toMatch(/allocated maximum/);
    expect(partnerRepresentativeCountError(0, 0)).toBeNull();
    expect(representativeFormCount(3)).toBe(3);
    expect(representativeFormCount(0)).toBe(0);
    expect(representativeFormCount(null)).toBe(0);
    expect(representativeFormCount(undefined)).toBe(0);
  });

  it("keeps historical representative rows when the allocation is reduced", () => {
    const merged = mergeRepresentativesPreservingHistory(
      [
        { name: "A", designation: "Dean", phone: "9876543210" },
        { name: "B", designation: "Lead", phone: "9876543211" },
      ],
      1,
      [{ name: "Asha", designation: "Director", phone: "9876543212" }]
    );
    expect(merged[1]).toEqual({
      name: "B",
      designation: "Lead",
      phone: "9876543211",
    });
  });
});

describe("representative submission maximum", () => {
  const valid = (name: string) => ({
    name,
    designation: "Director",
    phone: "9876543210",
  });

  function collect(rows: Array<{ name?: string; designation?: string; phone?: string }>, allocation = 3) {
    return collectRepresentativeSubmission(rows, allocation, isValidIndianMobile);
  }

  it("allows 0 through the allocation and rejects one more", () => {
    expect(collect([]).ok).toBe(true);
    expect(collect([valid("A")]).ok).toBe(true);
    expect(collect([valid("A"), valid("B")]).ok).toBe(true);
    expect(collect([valid("A"), valid("B"), valid("C")]).ok).toBe(true);
    expect(collect([valid("A"), valid("B"), valid("C"), valid("D")]).ok).toBe(false);
  });

  it("ignores a blank row and rejects a partial row", () => {
    const withBlank = collect([
      valid("Asha"),
      { name: "", designation: "", phone: "" },
    ]);
    expect(withBlank.ok).toBe(true);
    if (withBlank.ok) expect(withBlank.representatives).toHaveLength(1);

    expect(collect([{ name: "John", designation: "", phone: "" }]).ok).toBe(false);
    expect(
      collect([{ name: "John", designation: "", phone: "9876543210" }]).ok
    ).toBe(false);
    expect(collect([valid("John")]).ok).toBe(true);
  });

  it("shows saved rows, one blank starter, and stops at the maximum", () => {
    expect(initialRepresentativeRows(30, undefined)).toHaveLength(1);
    expect(initialRepresentativeRows(30, [])).toEqual([
      { name: "", designation: "", phone: "" },
    ]);
    expect(
      initialRepresentativeRows(30, [
        valid("A"),
        valid("B"),
      ])
    ).toHaveLength(2);
    expect(canAddRepresentative(2, 30)).toBe(true);
    expect(canAddRepresentative(3, 3)).toBe(false);
    expect(canAddRepresentative(30, 30)).toBe(false);

    const source = readFileSync(
      path.join(root, "features/dashboard/representatives-section.tsx"),
      "utf8"
    );
    expect(source).toContain("+ Add representative");
    expect(source).toContain("Remove representative");
    expect(source).not.toContain("Number of representatives");
    expect(source).not.toContain('type="number"');
    expect(source).not.toContain("Array.from({ length: allocation }");
    expect(source).toContain(
      "Tell us how many people from your team will attend Career Uttsav."
    );
  });
});

describe("panel discussion visibility", () => {
  it("hides the section for zero, null, and undefined slots and shows it for one or more", () => {
    expect(hasAllocatedPanelSlots([{ slotBudget: 0 }])).toBe(false);
    expect(hasAllocatedPanelSlots([{ slotBudget: null }])).toBe(false);
    expect(hasAllocatedPanelSlots([{}])).toBe(false);
    expect(hasAllocatedPanelSlots([{ slotBudget: 1 }])).toBe(true);
  });

  it("does not render the empty panel or speaker placeholders", () => {
    const seats = readFileSync(
      path.join(root, "features/dashboard/seminar-section.tsx"),
      "utf8"
    );
    const speakers = readFileSync(
      path.join(root, "features/dashboard/submissions-section.tsx"),
      "utf8"
    );
    expect(seats).toContain("if (!hasAllocatedPanelSlots(packages)) return null");
    expect(seats).not.toContain("No seminar seats");
    expect(speakers).toContain("if (!hasAllocatedPanelSlots(packages)) return null");
    expect(speakers).not.toContain("available when seminar");
  });
});

describe("partner-facing terminology", () => {
  it("uses Panel Discussion in display copy and leaves seminar ids unchanged", () => {
    expect(partnerFacingCopy("Seminar seats")).toBe("Panel Discussion seats");
    expect(partnerFacingCopy("selected seminar session")).toBe(
      "selected panel discussion session"
    );
    expect(partnerFacingCopy("Seminars")).toBe("Panel Discussions");
    expect("sem-001-a").toBe("sem-001-a");

    const login = readFileSync(
      path.join(root, "features/login/login-view.tsx"),
      "utf8"
    );
    expect(login).toContain("panel discussion details");
    expect(login).not.toContain("seminar details");

    const route = readFileSync(path.join(root, "app/api/partner/route.ts"), "utf8");
    expect(route).toContain('body.action === "seminar_speakers"');
    expect(route).toContain("body.seminarId");
  });
});

describe("LinkedIn and SMS", () => {
  it("treats LinkedIn as optional and validates URLs", () => {
    expect(validateLinkedInProfile("")).toEqual({ ok: true, value: "" });
    expect(validateLinkedInProfile("https://linkedin.com/in/asha").ok).toBe(true);
    expect(validateLinkedInProfile("asha").ok).toBe(false);
  });

  it("accepts 300 SMS characters and rejects 301", () => {
    expect(validateSmsContent("x".repeat(300))).toBeNull();
    expect(validateSmsContent("x".repeat(301))).toBe(SMS_CONTENT_TOO_LONG_MESSAGE);
    expect(SMS_CONTENT_MAX_LENGTH).toBe(300);
    const sms = readFileSync(
      path.join(root, "features/dashboard/submissions-section.tsx"),
      "utf8"
    );
    expect(sms).toContain("maxLength={SMS_CONTENT_MAX_LENGTH}");
    expect(sms).toContain("{draft.length} / {SMS_CONTENT_MAX_LENGTH}");
    expect(sms).not.toContain("max 500 characters");
  });
});

describe("uploads and advertisement labels", () => {
  const extensions = ["svg", "png", "jpg", "jpeg", "pdf", "cdr", "ai", "eps"];

  it("accepts allowed extensions and rejects others and oversized files", () => {
    for (const extension of extensions) {
      expect(
        validateUploadFile({
          fileName: `file.${extension.toUpperCase()}`,
          fileSizeBytes: MAX_UPLOAD_BYTES,
        })
      ).toBeNull();
    }
    expect(
      validateUploadFile({ fileName: "notes.docx", fileSizeBytes: 4 })
    ).toBe(UNSUPPORTED_FILE_MESSAGE);
    expect(
      validateUploadFile({
        fileName: "logo.png",
        fileSizeBytes: MAX_UPLOAD_BYTES + 1,
      })
    ).toBe(OVERSIZE_FILE_MESSAGE);
  });

  it("keeps format and size limits out of the normal upload copy", () => {
    const hero = readFileSync(
      path.join(root, "features/dashboard/hero-section.tsx"),
      "utf8"
    );
    const submissions = readFileSync(
      path.join(root, "features/dashboard/submissions-section.tsx"),
      "utf8"
    );
    expect(hero).toContain(`accept={PORTAL_UPLOAD_ACCEPT}`);
    expect(hero).not.toContain("40 MB");
    expect(hero).not.toContain("PNG or SVG");
    expect(submissions).not.toContain("PNG or JPG");
    expect(submissions).not.toContain("40 MB");
    expect(PORTAL_UPLOAD_ACCEPT).toBe(".svg,.png,.jpg,.jpeg,.pdf,.cdr,.ai,.eps");
  });

  it("shows the Careers After +2 dimensions", () => {
    expect(deliverableOptionLabel("full page")).toBe(
      'Full Page (6.5" W × 4.75" H)'
    );
    expect(deliverableOptionLabel("half page")).toBe(
      'Half Page (6.5" W × 9.5" H)'
    );
  });
});
