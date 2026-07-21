import type { Event, Partner } from "@/lib/types";

function svgLogo(label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="100%" height="100%" rx="24" fill="#1F3864"/><text x="50%" y="50%" fill="#F3F6FA" font-family="Georgia,serif" font-size="28" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const mockEvents: Event[] = [
  {
    id: "evt-001",
    title: "Career Utsav Bengaluru 2026",
    city: "Bangalore",
    startDate: "2026-08-15",
    endDate: "2026-08-16",
    seminars: [
      {
        id: "sem-001-a",
        title: "How to select a stream – Art – Science – Commerce?",
        date: "2026-08-15",
        startTime: "10:00",
        endTime: "11:00",
        hall: 1,
      },
      {
        id: "sem-001-b",
        title: "Real Careers with Artificial Intelligence",
        date: "2026-08-15",
        startTime: "11:30",
        endTime: "12:30",
        hall: 2,
      },
      {
        id: "sem-001-c",
        title: "All about Overseas Education",
        date: "2026-08-16",
        startTime: "10:00",
        endTime: "11:00",
        hall: 1,
      },
    ],
  },
];

const goldDeliverables = [
  { id: "d1", key: "stall", label: "Stall Size (Square Meter)", included: true, option: "12 (4x3)" },
  { id: "d2", key: "weblink", label: "Weblink in the Career Uttsav website", included: true, option: "Partner page listing" },
  { id: "d3", key: "branding", label: "Common branding at event venue", included: true, option: "Venue presence" },
  { id: "d4", key: "souvenir", label: "Full page write-up in the event souvenir", included: true },
  { id: "d5", key: "ad", label: "Advertisement in “Careers After +2”", included: true, option: "full page" },
  { id: "d6", key: "panel", label: "Panel discussion", included: true, option: "60 mins" },
  { id: "d7", key: "logo_creative", label: "Logo on B2C creatives", included: true },
  { id: "d8", key: "students", label: "Access to pre-registered students", included: true, option: "selected seminar session" },
];

export const seedPartners: Partner[] = [
  {
    id: "partner-002",
    name: "PES University",
    city: "Bangalore",
    state: "Karnataka",
    eventIds: ["evt-001"],
    stage: "Confirmed",
    sponsorshipTier: "Stall Partner",
    eventPartnerships: [
      {
        eventId: "evt-001",
        sponsorshipTier: "Stall Partner",
        deliverables: goldDeliverables.slice(0, 5).map((d) => ({ ...d, id: `pes-${d.id}` })),
        seminarSlotCount: 2,
      },
    ],
    seminarSlotAssignments: [
      { eventId: "evt-001", seminarId: "sem-001-a", slots: 1 },
      { eventId: "evt-001", seminarId: "sem-001-c", slots: 1 },
    ],
    portalLogin: "kavitha.nair@pes.edu",
    portalTempPassword: "PesPortal9x",
    portalInviteEmail: "kavitha.nair@pes.edu",
    portalInviteSentAt: "2026-06-29T10:00:00+05:30",
    portalFasciaName: "PES UNIVERSITY",
    portalWebsiteUrl: "https://www.pes.edu",
    portalDocuments: [
      {
        id: "pdoc-pes-logo",
        kind: "logo",
        label: "University logo",
        fileName: "pes-logo.svg",
        mimeType: "image/svg+xml",
        url: svgLogo("PES"),
        fileSizeBytes: 18420,
        uploadedAt: "2026-07-01T11:20:00+05:30",
      },
    ],
    portalSeminarSpeakers: [
      {
        eventId: "evt-001",
        seminarId: "sem-001-a",
        speakers: [
          {
            name: "Prof. Kavitha Nair",
            designation: "Director — Admissions",
            email: "kavitha.nair@pes.edu",
          },
        ],
        updatedAt: "2026-07-03T10:00:00+05:30",
      },
    ],
  },
  {
    id: "partner-rvu",
    name: "RV University",
    city: "Bangalore",
    state: "Karnataka",
    eventIds: ["evt-001"],
    stage: "Confirmed",
    sponsorshipTier: "Knowledge Partner (Gold)",
    eventPartnerships: [
      {
        eventId: "evt-001",
        sponsorshipTier: "Knowledge Partner (Gold)",
        deliverables: goldDeliverables.map((d) => ({ ...d, id: `rvu-${d.id}` })),
        seminarSlotCount: 3,
      },
    ],
    seminarSlotAssignments: [
      { eventId: "evt-001", seminarId: "sem-001-a", slots: 2 },
      { eventId: "evt-001", seminarId: "sem-001-b", slots: 1 },
    ],
    portalLogin: "partnerships@rvu.edu.in",
    portalTempPassword: "TempPass9x",
    portalInviteEmail: "partnerships@rvu.edu.in",
    portalInviteSentAt: "2026-07-10T10:00:00+05:30",
    portalDocuments: [],
    portalSeminarSpeakers: [],
  },
];

export function findPartnerByCredentials(login: string, password: string) {
  const normalized = login.trim().toLowerCase();
  return seedPartners.find(
    (p) =>
      p.portalLogin?.toLowerCase() === normalized &&
      (p.portalTempPassword === password ||
        (p.portalPasswordChangedAt && p.portalTempPassword === password))
  );
}
