import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  changeAdminPartnerPassword,
  fetchAdminSeminarTopics,
  postAdminPortalSubmission,
  saveAdminSeminarTopics,
} from "@/lib/admin-api";
import {
  getEvents,
  getPartnerForSession,
  mergeAdminPartners,
  updatePartner,
} from "@/lib/partner-store";
import {
  buildEventPackageSummaries,
  enrichSeminarSlotAssignments,
  resolveEventPartnerships,
} from "@/lib/partner-event-config";
import { readSession, sessionFailureResponse, withSession, withoutSession } from "@/lib/session";
import { getPartnerPortalUploadStatus } from "@/lib/partner-portal-docs";
import { validateLinkedInProfile } from "@/lib/linkedin-profile";
import { isValidIndianMobile, normalizeIndianMobile } from "@/lib/phone";
import {
  collectRepresentativeSubmission,
  mergeRepresentativesPreservingHistory,
  representativeAllocationForEvent,
} from "@/lib/representative-allocation";
import { validateSmsContent } from "@/lib/sms-content";
import { partnerSeminarSpeakerTargetError } from "@/lib/seminar-speaker-guard";
import { seminarTopicActorId } from "@/lib/seminar-topics";
import type { PartnerPortalDocument } from "@/lib/types";
import {
  isStorageBackedSpeakerPhoto,
  speakerHasPersistedPhoto,
} from "@/lib/partner-portal-speaker";
import type { PartnerSeminarSpeakerDetail } from "@/lib/types";
import {
  validateStoredUpload,
} from "@/lib/upload-policy";

function invalidSessionResponse() {
  // Clear the cookie so /login does not bounce straight back to /dashboard.
  return withoutSession(
    NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  );
}

async function requirePortalSession() {
  const read = await readSession();
  if (read.status !== "ok") return sessionFailureResponse(read.status);
  return read.session;
}

export async function GET() {
  // Merge Admin partners before session validation so a valid cookie is not
  // rejected solely because this worker's in-memory store was still cold.
  await mergeAdminPartners();
  const session = await requirePortalSession();
  if (session instanceof NextResponse) return session;

  try {
    const partner = getPartnerForSession(session);
    if (!partner) {
      return invalidSessionResponse();
    }

    const events = getEvents();
    const partnerships = resolveEventPartnerships(partner);
    const slotAssignments = enrichSeminarSlotAssignments(
      partner.seminarSlotAssignments ?? [],
      events
    );
    const packages = buildEventPackageSummaries(
      partnerships,
      slotAssignments,
      events
    );

    if (session.mustChangePassword) {
      return NextResponse.json({
        partner: { id: partner.id, name: partner.name },
        packages: [],
        events: [],
        mustChangePassword: true,
      });
    }

    const seminarTopics = await fetchAdminSeminarTopics(partner.id);

    return NextResponse.json({
      partner,
      packages,
      events,
      seminarTopics,
      uploadStatus: getPartnerPortalUploadStatus(partner),
      mustChangePassword: false,
    });
  } catch (err) {
    console.error("[api/partner GET]", err);
    return NextResponse.json(
      { error: "Failed to load partner dashboard" },
      { status: 500 }
    );
  }
}

async function persistSubmission(
  partnerId: string,
  body: Parameters<typeof postAdminPortalSubmission>[1]
) {
  const saved = await postAdminPortalSubmission(partnerId, body);
  if (!saved.ok) {
    return NextResponse.json({ error: saved.error }, { status: saved.status });
  }
  await mergeAdminPartners();
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  // Same ordering as GET — required for skip_password_prompt ("I'll do it later").
  await mergeAdminPartners();
  const session = await requirePortalSession();
  if (session instanceof NextResponse) return session;

  const body = await request.json();
  const partner = getPartnerForSession(session);
  if (!partner) {
    return invalidSessionResponse();
  }

  if (body.action === "skip_password_prompt") {
    return NextResponse.json(
      { error: "Set a new password before continuing." },
      { status: 403 }
    );
  }

  if (session.mustChangePassword && body.action !== "change_password") {
    return NextResponse.json(
      { error: "Set a new password before continuing." },
      { status: 403 }
    );
  }

  if (body.action === "change_password") {
    const password = String(body.password ?? "");
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }
    const changed = await changeAdminPartnerPassword({
      partnerId: partner.id,
      password,
    });
    if (!changed.ok) {
      return NextResponse.json({ error: changed.error }, { status: changed.status });
    }
    updatePartner(partner.id, {
      portalPasswordChangedAt: changed.portalPasswordChangedAt,
      portalAuthVersion: changed.portalAuthVersion,
      hasPortalPassword: true,
    });
    return withSession(NextResponse.json({ ok: true }), {
      ...session,
      mustChangePassword: false,
      authVersion: changed.portalAuthVersion,
    });
  }

  if (body.action === "text_field") {
    const field = body.field as
      | "portalFasciaName"
      | "portalWebsiteUrl"
      | "portalSmsContent";
    if (!field) {
      return NextResponse.json({ error: "Invalid field" }, { status: 400 });
    }
    const nextValue = String(body.value ?? "");
    if (field === "portalSmsContent") {
      const smsError = validateSmsContent(nextValue);
      if (smsError) {
        return NextResponse.json({ error: smsError }, { status: 400 });
      }
    }
    return persistSubmission(partner.id, {
      op: "set_field",
      field,
      value: nextValue,
    });
  }

  if (body.action === "upload_document") {
    if (body.kind === "ad_creative") {
      return NextResponse.json(
        { error: "Use the advertisement creative uploader." },
        { status: 400 }
      );
    }
    if (body.kind === "logo" || body.kind === "souvenir_writeup") {
      return NextResponse.json(
        { error: "Use the storage uploader." },
        { status: 400 }
      );
    }
    const fileName = String(body.fileName ?? "");
    const fileSizeBytes = Number(body.fileSizeBytes) || 0;
    const url = String(body.url ?? "");
    const uploadError = validateStoredUpload({
      fileName,
      fileSizeBytes,
      url,
      kind: body.kind,
    });
    if (uploadError) {
      return NextResponse.json({ error: uploadError }, { status: 400 });
    }
    return persistSubmission(partner.id, {
      op: "upsert_document",
      document: {
        id: `${partner.id}-${String(body.kind)}`,
        kind: body.kind,
        label: String(body.label ?? ""),
        fileName,
        mimeType: String(body.mimeType ?? ""),
        url,
        fileSizeBytes,
        uploadedAt: new Date().toISOString(),
      },
    });
  }

  if (body.action === "remove_document") {
    const kind = body.kind as PartnerPortalDocument["kind"] | undefined;
    if (!kind) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    return persistSubmission(partner.id, { op: "remove_document", kind });
  }

  if (body.action === "seminar_topics") {
    const saved = await saveAdminSeminarTopics(seminarTopicActorId(partner.id, body), {
      topics: Array.isArray(body.topics) ? body.topics : [],
      confirm: body.confirm === true,
    });
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: saved.status });
    }
    await mergeAdminPartners();
    return NextResponse.json({ ok: true, seminarTopics: saved.catalog });
  }

  if (body.action === "seminar_speakers") {
    const eventId = String(body.eventId ?? "");
    const seminarId = String(body.seminarId ?? "");
    const existingRow = (partner.portalSeminarSpeakers ?? []).find(
      (row) => row.eventId === eventId && row.seminarId === seminarId
    );
    const existingById = new Map(
      (existingRow?.speakers ?? [])
        .filter((speaker) => speaker.id?.trim())
        .map((speaker) => [speaker.id!.trim(), speaker])
    );

    const speakers: Array<
      PartnerSeminarSpeakerDetail & {
        linkedInOk: boolean;
        linkedInError: string;
      }
    > = (Array.isArray(body.speakers) ? body.speakers : []).map(
      (s: PartnerSeminarSpeakerDetail) => {
        const linkedIn = validateLinkedInProfile(s.linkedinProfile);
        const requestedId = String(s.id ?? "").trim();
        const prior = requestedId ? existingById.get(requestedId) : undefined;
        const incomingUrl = String(s.photoUrl ?? "").trim();
        const photoUrl = incomingUrl.startsWith("blob:") ? "" : incomingUrl;
        const next: PartnerSeminarSpeakerDetail = {
          id: requestedId || prior?.id || randomUUID(),
          name: String(s.name ?? "").trim(),
          designation: String(s.designation ?? "").trim(),
          contact: normalizeIndianMobile(String(s.contact ?? "")),
          introduction: String(s.introduction ?? "").trim(),
          photoUrl,
          photoStorageProvider: s.photoStorageProvider,
          photoStorageBucket: String(s.photoStorageBucket ?? "").trim() || undefined,
          photoStoragePath: String(s.photoStoragePath ?? "").trim() || undefined,
          photoFileName: s.photoFileName,
          photoMimeType: s.photoMimeType,
          photoFileSizeBytes: s.photoFileSizeBytes,
          photoUploadedAt: s.photoUploadedAt,
          linkedinProfile: linkedIn.ok ? linkedIn.value : String(s.linkedinProfile ?? ""),
        };
        const copyPhoto = (from: PartnerSeminarSpeakerDetail) => {
          next.photoUrl = from.photoUrl;
          next.photoStorageProvider = from.photoStorageProvider;
          next.photoStorageBucket = from.photoStorageBucket;
          next.photoStoragePath = from.photoStoragePath;
          next.photoFileName = from.photoFileName;
          next.photoMimeType = from.photoMimeType;
          next.photoFileSizeBytes = from.photoFileSizeBytes;
          next.photoUploadedAt = from.photoUploadedAt;
        };
        if (!speakerHasPersistedPhoto(next) && prior && speakerHasPersistedPhoto(prior)) {
          copyPhoto(prior);
        } else if (
          prior &&
          speakerHasPersistedPhoto(prior) &&
          speakerHasPersistedPhoto(next)
        ) {
          const priorPath = prior.photoStoragePath?.trim() || prior.photoUrl?.trim() || "";
          const nextPath = next.photoStoragePath?.trim() || next.photoUrl?.trim() || "";
          if (priorPath && nextPath && priorPath !== nextPath) {
            const priorTime = Date.parse(prior.photoUploadedAt ?? "");
            const nextTime = Date.parse(next.photoUploadedAt ?? "");
            const incomingIsNewer =
              Number.isFinite(nextTime) &&
              (!Number.isFinite(priorTime) || nextTime >= priorTime);
            if (!incomingIsNewer) copyPhoto(prior);
          }
        }
        return {
          ...next,
          linkedInOk: linkedIn.ok,
          linkedInError: linkedIn.ok ? "" : linkedIn.error,
        };
      }
    );

    const invalidLink = speakers.find((speaker) => !speaker.linkedInOk);
    if (invalidLink) {
      return NextResponse.json(
        { error: invalidLink.linkedInError },
        { status: 400 }
      );
    }

    const photoError = speakers
      .map((speaker) => {
        const url = speaker.photoUrl?.trim() ?? "";
        if (!url.startsWith("data:")) return null;
        return validateStoredUpload({
          fileName: speaker.photoFileName || "speaker-photo.png",
          fileSizeBytes: speaker.photoFileSizeBytes || 1,
          url,
          kind: "speaker_photo",
        });
      })
      .find((error) => error);
    if (photoError) {
      return NextResponse.json({ error: photoError }, { status: 400 });
    }

    const speakerTargetError = partnerSeminarSpeakerTargetError({
      partner,
      events: getEvents(),
      eventId,
      seminarId,
    });
    if (speakerTargetError) {
      return NextResponse.json({ error: speakerTargetError }, { status: 400 });
    }

    if (
      speakers.length === 0 ||
      speakers.some(
        (s) =>
          !s.name ||
          !s.designation ||
          !isValidIndianMobile(s.contact ?? "") ||
          !s.introduction ||
          !speakerHasPersistedPhoto(s)
      )
    ) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit mobile number for each speaker" },
        { status: 400 }
      );
    }

    return persistSubmission(partner.id, {
      op: "upsert_speakers",
      row: {
        eventId,
        seminarId,
        updatedAt: new Date().toISOString(),
        speakers: speakers.map((speaker) => ({
          id: speaker.id,
          name: speaker.name,
          designation: speaker.designation,
          contact: speaker.contact,
          introduction: speaker.introduction,
          photoUrl: isStorageBackedSpeakerPhoto(speaker) ? "" : speaker.photoUrl,
          photoStorageProvider: speaker.photoStorageProvider,
          photoStorageBucket: speaker.photoStorageBucket,
          photoStoragePath: speaker.photoStoragePath,
          photoFileName: speaker.photoFileName,
          photoMimeType: speaker.photoMimeType,
          photoFileSizeBytes: speaker.photoFileSizeBytes,
          photoUploadedAt: speaker.photoUploadedAt,
          linkedinProfile: speaker.linkedinProfile || undefined,
        })),
      },
    });
  }

  if (body.action === "representatives") {
    const eventId = String(body.eventId ?? "").trim();
    if (!eventId) {
      return NextResponse.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    const linkedEventIds = new Set(
      [
        ...(partner.eventIds ?? []),
        ...(partner.eventPartnerships ?? []).map((p) => p.eventId),
      ].filter(Boolean)
    );
    if (linkedEventIds.size > 0 && !linkedEventIds.has(eventId)) {
      return NextResponse.json(
        { error: "Event is not linked to this partner" },
        { status: 400 }
      );
    }

    const allocation = representativeAllocationForEvent(
      partner.eventPartnerships,
      eventId
    );
    const rows = (
      Array.isArray(body.representatives) ? body.representatives : []
    ) as Array<{ name?: string; designation?: string; phone?: string }>;
    const prepared = collectRepresentativeSubmission(
      rows.map((row) => ({
        name: String(row.name ?? "").trim(),
        designation: String(row.designation ?? "").trim(),
        phone: normalizeIndianMobile(String(row.phone ?? "")),
      })),
      allocation,
      isValidIndianMobile
    );
    if (!prepared.ok) {
      return NextResponse.json({ error: prepared.error }, { status: 400 });
    }

    const existing = (partner.portalRepresentatives ?? []).find(
      (row) => row.eventId === eventId
    );
    const representatives = mergeRepresentativesPreservingHistory(
      (existing?.representatives ?? []).map((row) => ({
        name: row.name,
        designation: row.designation ?? "",
        phone: row.phone,
      })),
      allocation,
      prepared.representatives
    );

    return persistSubmission(partner.id, {
      op: "upsert_representatives",
      row: {
        eventId,
        count: prepared.representatives.length,
        representatives,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
