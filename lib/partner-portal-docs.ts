import type {
  Partner,
  PartnerSeminarSlotAssignment,
} from "@/lib/types";
import { PORTAL_UPLOAD_ACCEPT } from "@/lib/upload-policy";
import { resolveEventPartnerships } from "@/lib/partner-event-config";
import {
  partnerPortalSubmissionEntitlements,
  type PortalSubmissionKey,
} from "@/lib/portal-entitlements";

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
    accept: PORTAL_UPLOAD_ACCEPT,
    templateUrl: "/templates/souvenir-write-up-format.docx",
    templateLabel: "Download write-up format",
  },
  {
    key: "ad_creative" as const,
    label: "Advertisement creative",
    type: "file" as const,
    docKind: "ad_creative" as const,
    accept: PORTAL_UPLOAD_ACCEPT,
  },
  {
    key: "sms_content" as const,
    label: "SMS content for participant mailers",
    type: "textarea" as const,
    field: "portalSmsContent" as const,
  },
  {
    key: "speaker_details" as const,
    label: "Speaker details for each panel discussion",
    type: "speakers" as const,
  },
] as const;

export type PartnerPortalSubmissionItem =
  (typeof PORTAL_SUBMISSION_ITEMS)[number];

function findDoc(partner: Partner, kind: string) {
  return (partner.portalDocuments ?? []).find(
    (d) => d.kind === kind || (kind === "souvenir_writeup" && d.kind === "writeup")
  );
}

export function submissionItemsForPartner(partner: Partner): PartnerPortalSubmissionItem[] {
  const entitlements = partnerPortalSubmissionEntitlements({
    partnerships: resolveEventPartnerships(partner).map((row) => ({
      eventId: row.eventId,
      deliverables: row.deliverables ?? [],
      representativeSlotCount: row.representativeSlotCount,
      seminarSlotCount: row.seminarSlotCount,
    })),
    seminarSlotAssignments: partner.seminarSlotAssignments,
    portalFasciaName: partner.portalFasciaName,
    portalWebsiteUrl: partner.portalWebsiteUrl,
    portalSmsContent: partner.portalSmsContent,
    documents: partner.portalDocuments,
    speakers: partner.portalSeminarSpeakers,
    representatives: partner.portalRepresentatives,
  });

  return PORTAL_SUBMISSION_ITEMS.filter((item) => {
    const key = item.key as PortalSubmissionKey;
    return entitlements[key]?.applicable !== false;
  });
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
    | "portalRepresentatives"
    | "seminarSlotAssignments"
    | "eventPartnerships"
    | "eventIds"
    | "deliverables"
    | "sponsorshipTier"
  >
) {
  const entitlements = partnerPortalSubmissionEntitlements({
    partnerships: resolveEventPartnerships(partner as Partner).map((row) => ({
      eventId: row.eventId,
      deliverables: row.deliverables ?? [],
      representativeSlotCount: row.representativeSlotCount,
      seminarSlotCount: row.seminarSlotCount,
    })),
    seminarSlotAssignments: partner.seminarSlotAssignments,
    portalFasciaName: partner.portalFasciaName,
    portalWebsiteUrl: partner.portalWebsiteUrl,
    portalSmsContent: partner.portalSmsContent,
    documents: partner.portalDocuments,
    speakers: partner.portalSeminarSpeakers,
    representatives: partner.portalRepresentatives,
  });

  const applicableKeys = (
    [
      "logo",
      "fascia_name",
      "website_link",
      "souvenir_writeup",
      "ad_creative",
      "sms_content",
      "speaker_details",
    ] as PortalSubmissionKey[]
  ).filter((key) => entitlements[key].applicable);

  const logoDoc = findDoc(partner as Partner, "logo");

  const items = applicableKeys.map((key) => {
    const complete = entitlements[key].complete;
    if (key === "logo") {
      return { key, label: "University Logo", complete: Boolean(logoDoc) };
    }
    if (key === "fascia_name") {
      return { key, label: "Fascia Name", complete };
    }
    if (key === "website_link") {
      return { key, label: "Website link", complete };
    }
    if (key === "souvenir_writeup") {
      return {
        key,
        label: "Souvenir write-up",
        complete: Boolean(findDoc(partner as Partner, "souvenir_writeup")),
      };
    }
    if (key === "ad_creative") {
      return {
        key,
        label: "Ad creative",
        complete: Boolean(findDoc(partner as Partner, "ad_creative")),
      };
    }
    if (key === "sms_content") {
      return { key, label: "SMS content", complete };
    }
    return { key, label: "Speaker details", complete };
  });

  const missing = items.filter((i) => !i.complete);
  const completed = items.length - missing.length;

  return {
    items,
    missing,
    allComplete: missing.length === 0,
    progress: items.length === 0 ? 1 : completed / items.length,
    completed,
    total: items.length,
    entitlements,
  };
}
