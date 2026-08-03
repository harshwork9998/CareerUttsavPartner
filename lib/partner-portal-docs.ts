import type {
  Partner,
  PartnerSeminarSlotAssignment,
} from "@/lib/types";

export const PORTAL_SUBMISSION_ITEMS = [
  {
    key: "fascia_name" as const,
    label: "Fascia Name (Name on the Stall Board)",
    type: "text" as const,
    field: "portalFasciaName" as const,
  },
  {
    key: "website_link" as const,
    label: "University Website link",
    type: "url" as const,
    field: "portalWebsiteUrl" as const,
  },
  {
    key: "souvenir_writeup" as const,
    label: "Full page write up in event souvenir",
    type: "file" as const,
    docKind: "souvenir_writeup" as const,
    accept: ".pdf,.doc,.docx",
    templateUrl: "/templates/souvenir-write-up-format.docx",
    templateLabel: "Download write-up format",
  },
  {
    key: "ad_creative" as const,
    label: "Advertisement creative",
    type: "file" as const,
    docKind: "ad_creative" as const,
    accept: "image/*,.pdf",
  },
  {
    key: "sms_content" as const,
    label: "SMS content for participant mailers",
    type: "textarea" as const,
    field: "portalSmsContent" as const,
  },
  {
    key: "speaker_details" as const,
    label: "Speaker details for each seminar",
    type: "speakers" as const,
  },
] as const;

function findDoc(partner: Partner, kind: string) {
  return (partner.portalDocuments ?? []).find(
    (d) => d.kind === kind || (kind === "souvenir_writeup" && d.kind === "writeup")
  );
}

function allottedSeminars(assignments: PartnerSeminarSlotAssignment[] | undefined) {
  return (assignments ?? []).filter((a) => a.slots > 0);
}

export function getPartnerPortalUploadStatus(
  partner: Pick<
    Partner,
    | "portalDocuments"
    | "portalInviteSentAt"
    | "portalFasciaName"
    | "portalWebsiteUrl"
    | "portalSmsContent"
    | "portalSeminarSpeakers"
    | "seminarSlotAssignments"
  >
) {
  const logoDoc = findDoc(partner as Partner, "logo");
  const writeupDoc = findDoc(partner as Partner, "souvenir_writeup");
  const adDoc = findDoc(partner as Partner, "ad_creative");

  const seminars = allottedSeminars(partner.seminarSlotAssignments);
  const speakersComplete =
    seminars.length === 0 ||
    seminars.every((slot) =>
      (partner.portalSeminarSpeakers ?? []).some(
        (row) =>
          row.eventId === slot.eventId &&
          row.seminarId === slot.seminarId &&
          row.speakers.some(
            (s) =>
              Boolean(s.name.trim()) &&
              Boolean(s.designation?.trim()) &&
              /^[6-9]\d{9}$/.test(
                String(s.contact ?? s.phone ?? "").replace(/\D/g, "").slice(-10)
              ) &&
              Boolean(s.introduction?.trim()) &&
              Boolean(s.photoUrl?.trim())
          )
      )
    );

  const items = [
    { key: "logo", label: "University Logo", complete: Boolean(logoDoc) },
    {
      key: "fascia_name",
      label: "Fascia Name",
      complete: Boolean(partner.portalFasciaName?.trim()),
    },
    {
      key: "website_link",
      label: "Website link",
      complete: Boolean(partner.portalWebsiteUrl?.trim()),
    },
    {
      key: "souvenir_writeup",
      label: "Souvenir write-up",
      complete: Boolean(writeupDoc),
    },
    {
      key: "ad_creative",
      label: "Ad creative",
      complete: Boolean(adDoc),
    },
    {
      key: "sms_content",
      label: "SMS content",
      complete: Boolean(partner.portalSmsContent?.trim()),
    },
    {
      key: "speaker_details",
      label: "Speaker details",
      complete: speakersComplete,
    },
  ];

  const missing = items.filter((i) => !i.complete);
  const completed = items.length - missing.length;

  return {
    items,
    missing,
    allComplete: missing.length === 0,
    progress: completed / items.length,
    completed,
    total: items.length,
  };
}
