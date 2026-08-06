export type SponsorshipTier =
  | "Presenting Partner"
  | "Co-Presenting Partner"
  | "University Partner"
  | "Knowledge Partner (Gold)"
  | "Knowledge Partner (Silver)"
  | "Education Partner"
  | "Stall Partner";

export interface PartnerDeliverable {
  id: string;
  key: string;
  label: string;
  included: boolean;
  option?: string;
  isCustom?: boolean;
}

export interface PartnerEventPartnership {
  eventId: string;
  sponsorshipTier?: SponsorshipTier;
  deliverables: PartnerDeliverable[];
  seminarSlotCount: number;
}

export interface PartnerSeminarSlotAssignment {
  eventId: string;
  seminarId: string;
  slots: number;
  seminarTitle?: string;
}

export type PartnerPortalDocumentKind =
  | "logo"
  | "banner"
  | "brochure"
  | "agreement"
  | "souvenir_writeup"
  | "ad_creative"
  | "writeup";

export interface PartnerPortalDocument {
  id: string;
  kind: PartnerPortalDocumentKind;
  label: string;
  fileName: string;
  mimeType: string;
  url: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

export interface PartnerSeminarSpeakerDetail {
  name: string;
  designation?: string;
  contact?: string;
  introduction?: string;
  /** Data URL or hosted URL for the speaker headshot. */
  photoUrl?: string;
  phone?: string;
  email?: string;
}

export interface PartnerSeminarSpeakerSubmission {
  eventId: string;
  seminarId: string;
  speakers: PartnerSeminarSpeakerDetail[];
  updatedAt: string;
}

/** On-ground team attending Career Uttsav with the partner. */
export interface PartnerRepresentative {
  name: string;
  phone: string;
}

export interface PartnerRepresentativesSubmission {
  /** Event (city edition) these on-ground reps are attending. */
  eventId: string;
  count: number;
  representatives: PartnerRepresentative[];
  updatedAt: string;
}

export interface Partner {
  id: string;
  name: string;
  city: string;
  state: string;
  eventIds: string[];
  stage: string;
  sponsorshipTier?: SponsorshipTier;
  eventPartnerships?: PartnerEventPartnership[];
  deliverables?: PartnerDeliverable[];
  seminarSlotAssignments?: PartnerSeminarSlotAssignment[];
  portalLogin?: string;
  portalTempPassword?: string;
  portalPasswordChangedAt?: string;
  /** Set when the first-login password prompt is dismissed with "I'll do it later". */
  portalPasswordPromptSkippedAt?: string;
  /** Incremented whenever the portal password changes — invalidates sessions. */
  portalAuthVersion?: number;
  portalInviteEmail?: string;
  portalInviteSentAt?: string;
  portalDocuments?: PartnerPortalDocument[];
  portalFasciaName?: string;
  portalWebsiteUrl?: string;
  portalSmsContent?: string;
  portalSeminarSpeakers?: PartnerSeminarSpeakerSubmission[];
  /** On-ground reps per event/city, with name + phone for each. */
  portalRepresentatives?: PartnerRepresentativesSubmission[];
}

export interface EventSeminar {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  hall: number;
}

export interface Event {
  id: string;
  title: string;
  city: string;
  startDate: string;
  endDate: string;
  seminars: EventSeminar[];
}

export type EventPackageSummary = {
  eventId: string;
  title: string;
  city: string;
  tier: SponsorshipTier | undefined;
  deliverables: Array<{ id: string; label: string; option?: string }>;
  seminars: Array<{
    id: string;
    title: string;
    slots: number;
    date: string;
    startTime: string;
    endTime: string;
    hall: number;
  }>;
  slotBudget: number;
  seatsAssigned: number;
};

export type PortalSession = {
  partnerId: string;
  login: string;
  mustChangePassword: boolean;
  /** Bumped on password change/reset — stale cookies are rejected. */
  authVersion: number;
};
