import type { Event, Partner } from "@/lib/types";

function svgLogo(label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="100%" height="100%" rx="24" fill="#1F3864"/><text x="50%" y="50%" fill="#F3F6FA" font-family="Georgia,serif" font-size="28" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const mockEvents: Event[] = [
  {
    id: "evt-001",
    title: "Career Uttsav Bengaluru 2026",
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
      {
        id: "sem-001-d",
        title: "Medicine in the 21st century",
        date: "2026-08-16",
        startTime: "14:00",
        endTime: "15:00",
        hall: 3,
      },
    ],
  },
  {
    id: "evt-002",
    title: "Career Uttsav Mysore 2026",
    city: "Mysore",
    startDate: "2026-07-05",
    endDate: "2026-07-05",
    seminars: [
      {
        id: "sem-002-a",
        title: "Cracking the codes to ace competitive exams",
        date: "2026-07-05",
        startTime: "11:00",
        endTime: "12:00",
        hall: 1,
      },
      {
        id: "sem-002-b",
        title: "Careers in Management & Entrepreneurship",
        date: "2026-07-05",
        startTime: "14:00",
        endTime: "15:00",
        hall: 2,
      },
    ],
  },
  {
    id: "evt-003",
    title: "Career Uttsav Hubli 2026",
    city: "Hubli",
    startDate: "2026-12-10",
    endDate: "2026-12-11",
    seminars: [
      {
        id: "sem-003-a",
        title: "New-age Engineering Careers",
        date: "2026-12-10",
        startTime: "10:00",
        endTime: "11:00",
        hall: 1,
      },
      {
        id: "sem-003-b",
        title: "Is CA / CS My Cup of Tea?",
        date: "2026-12-11",
        startTime: "11:00",
        endTime: "12:00",
        hall: 2,
      },
    ],
  },
];

const bangaloreDeliverables = [
  { id: "blr-d1", key: "stall", label: "Stall Size (Square Meter)", included: true, option: "12 (4x3)" },
  { id: "blr-d2", key: "weblink", label: "Weblink in the Career Uttsav website", included: true, option: "Partner page listing" },
  { id: "blr-d3", key: "branding", label: "Common branding at event venue", included: true, option: "Venue presence across Bangalore edition" },
  { id: "blr-d4", key: "souvenir", label: "Full page write-up in the event souvenir", included: true },
  { id: "blr-d5", key: "ad", label: "Advertisement in “Careers After +2”", included: true, option: "full page" },
  { id: "blr-d6", key: "panel", label: "Panel discussion", included: true, option: "60 mins" },
  { id: "blr-d7", key: "logo_creative", label: "Logo on B2C creatives", included: true },
  { id: "blr-d8", key: "students", label: "Access to pre-registered students", included: true, option: "selected seminar session" },
];

const mysoreDeliverables = [
  { id: "mys-d1", key: "stall", label: "Stall Size (Square Meter)", included: true, option: "9 (3x3)" },
  { id: "mys-d2", key: "weblink", label: "Weblink in the Career Uttsav website", included: true },
  { id: "mys-d3", key: "branding", label: "Common branding at event venue", included: true, option: "Mysore edition" },
  { id: "mys-d4", key: "souvenir", label: "Full page write-up in the event souvenir", included: true },
  { id: "mys-d5", key: "students", label: "Access to pre-registered students", included: true, option: "all sessions" },
];

const hubliDeliverables = [
  { id: "hub-d1", key: "stall", label: "Stall Size (Square Meter)", included: true, option: "6 (2x3)" },
  { id: "hub-d2", key: "weblink", label: "Weblink in the Career Uttsav website", included: true },
  { id: "hub-d3", key: "branding", label: "Common branding at event venue", included: true, option: "Hubli edition" },
  { id: "hub-d4", key: "logo_creative", label: "Logo on B2C creatives", included: true },
];

/** 3-event demo — use this login to preview multi-event layout */
export const MULTI_EVENT_DEMO = {
  login: "anitha.rao@christuniversity.in",
  password: "ChristDemo9x",
  name: "Christ University",
};

export const seedPartners: Partner[] = [
  {
    id: "partner-001",
    name: "Christ University",
    city: "Bangalore",
    state: "Karnataka",
    eventIds: ["evt-001", "evt-002", "evt-003"],
    stage: "Confirmed",
    sponsorshipTier: "Knowledge Partner (Gold)",
    eventPartnerships: [
      {
        eventId: "evt-001",
        sponsorshipTier: "Knowledge Partner (Gold)",
        deliverables: bangaloreDeliverables,
        seminarSlotCount: 3,
      },
      {
        eventId: "evt-002",
        sponsorshipTier: "University Partner",
        deliverables: mysoreDeliverables,
        seminarSlotCount: 2,
      },
      {
        eventId: "evt-003",
        sponsorshipTier: "Stall Partner",
        deliverables: hubliDeliverables,
        seminarSlotCount: 1,
      },
    ],
    seminarSlotAssignments: [
      { eventId: "evt-001", seminarId: "sem-001-a", slots: 1 },
      { eventId: "evt-001", seminarId: "sem-001-b", slots: 2 },
      { eventId: "evt-002", seminarId: "sem-002-a", slots: 1 },
      { eventId: "evt-002", seminarId: "sem-002-b", slots: 1 },
      { eventId: "evt-003", seminarId: "sem-003-a", slots: 1 },
    ],
    portalLogin: MULTI_EVENT_DEMO.login,
    portalTempPassword: MULTI_EVENT_DEMO.password,
    portalInviteEmail: MULTI_EVENT_DEMO.login,
    portalInviteSentAt: "2026-07-15T10:00:00+05:30",
    portalFasciaName: "CHRIST (DEEMED TO BE UNIVERSITY)",
    portalWebsiteUrl: "https://www.christuniversity.in",
    portalDocuments: [
      {
        id: "pdoc-christ-logo",
        kind: "logo",
        label: "University logo",
        fileName: "christ-logo.svg",
        mimeType: "image/svg+xml",
        url: svgLogo("CHRIST"),
        fileSizeBytes: 15200,
        uploadedAt: "2026-07-16T11:00:00+05:30",
      },
    ],
    portalSeminarSpeakers: [
      {
        eventId: "evt-001",
        seminarId: "sem-001-a",
        speakers: [
          {
            name: "Dr. Anitha Rao",
            designation: "Dean — Admissions",
            contact: "+91 98450 11001 · anitha.rao@christuniversity.in",
            introduction:
              "Dr. Anitha Rao leads admissions and outreach at Christ University, with two decades of experience guiding students through career pathways in liberal arts, sciences, and professional programmes.",
          },
        ],
        updatedAt: "2026-07-17T10:00:00+05:30",
      },
    ],
  },
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
        deliverables: bangaloreDeliverables.slice(0, 5).map((d) => ({ ...d, id: `pes-${d.id}` })),
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
            contact: "kavitha.nair@pes.edu",
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
        deliverables: bangaloreDeliverables.map((d) => ({ ...d, id: `rvu-${d.id}` })),
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
  return seedPartners.find((p) => {
    const loginMatch =
      p.portalLogin?.toLowerCase() === normalized ||
      p.portalInviteEmail?.toLowerCase() === normalized;
    return loginMatch && p.portalTempPassword === password;
  });
}
