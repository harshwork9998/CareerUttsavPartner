import { describe, expect, it } from "vitest";

import {
  findPortalSpeakerInPartner,
  speakerPhotoCommitIfMatchToken,
  speakerPhotoIfMatchTokenForUpload,
  speakerPhotoMatchToken,
} from "@/lib/partner-portal-speaker";
import type { Partner } from "@/lib/types";

const partner = (speakers: Partner["portalSeminarSpeakers"]): Partner =>
  ({
    id: "p1",
    name: "Test",
    city: "X",
    state: "Y",
    eventIds: ["e1"],
    stage: "Confirmed",
    portalSeminarSpeakers: speakers,
  }) as Partner;

describe("speaker photo upload tokens", () => {
  it("uses the saved partner photo path instead of a stale draft token", () => {
    const saved = partner([
      {
        eventId: "e1",
        seminarId: "s1",
        updatedAt: "t1",
        speakers: [
          {
            id: "sp1",
            name: "Ada",
            photoStorageProvider: "supabase",
            photoStorageBucket: "partner-portal-assets",
            photoStoragePath: "partners/p/speaker_photo/sp1/live.jpg",
            photoUploadedAt: "2026-11-08T12:00:00.000Z",
            photoUrl: "",
          },
        ],
      },
    ]);
    const draft = {
      id: "sp1",
      name: "Ada",
      photoStorageProvider: "supabase" as const,
      photoStorageBucket: "partner-portal-assets",
      photoStoragePath: "partners/p/speaker_photo/sp1/stale.jpg",
      photoUrl: "",
    };
    expect(speakerPhotoIfMatchTokenForUpload(saved, "e1", "s1", "sp1", draft)).toBe(
      "partners/p/speaker_photo/sp1/live.jpg"
    );
    expect(speakerPhotoMatchToken(draft)).toBe("partners/p/speaker_photo/sp1/stale.jpg");
  });

  it("omits a match token when no persisted photograph exists yet", () => {
    expect(
      speakerPhotoIfMatchTokenForUpload(partner([]), "e1", "s1", "sp1", { id: "sp1", name: "A" })
    ).toBeUndefined();
  });

  it("freezes the expected token at upload start even if partner data changes before commit", () => {
    const pathA = "partners/p/speaker_photo/sp1/a.jpg";
    const pathB = "partners/p/speaker_photo/sp1/b.jpg";
    const partnerA = partner([
      {
        eventId: "e1",
        seminarId: "s1",
        updatedAt: "t1",
        speakers: [
          {
            id: "sp1",
            name: "Ada",
            photoStorageProvider: "supabase",
            photoStorageBucket: "partner-portal-assets",
            photoStoragePath: pathA,
            photoUrl: "",
          },
        ],
      },
    ]);
    const partnerB = partner([
      {
        eventId: "e1",
        seminarId: "s1",
        updatedAt: "t2",
        speakers: [
          {
            id: "sp1",
            name: "Ada",
            photoStorageProvider: "supabase",
            photoStorageBucket: "partner-portal-assets",
            photoStoragePath: pathB,
            photoUrl: "",
          },
        ],
      },
    ]);
    const frozen = speakerPhotoIfMatchTokenForUpload(partnerA, "e1", "s1", "sp1");
    const reReadAtCommit = speakerPhotoIfMatchTokenForUpload(partnerB, "e1", "s1", "sp1");
    expect(frozen).toBe(pathA);
    expect(reReadAtCommit).toBe(pathB);
    expect(
      speakerPhotoCommitIfMatchToken({
        frozenAtUploadStart: frozen,
        resolveAtCommit: () => reReadAtCommit,
      })
    ).toBe(pathA);
  });

  it("finds a speaker in the partner submission row", () => {
    const row = partner([
      {
        eventId: "e1",
        seminarId: "s1",
        updatedAt: "t1",
        speakers: [{ id: "sp1", name: "Ada", photoUrl: "" }],
      },
    ]);
    expect(findPortalSpeakerInPartner(row, "e1", "s1", "sp1")?.name).toBe("Ada");
    expect(findPortalSpeakerInPartner(row, "e1", "s1", "missing")).toBeUndefined();
  });
});
