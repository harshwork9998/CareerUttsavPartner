"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ImagePlus,
  Link2,
  MessageSquare,
  Mic2,
  Type,
  X,
} from "lucide-react";

import { AdCreativeUploadCard } from "@/features/dashboard/ad-creative-upload-card";
import { PortalStorageUploadCard } from "@/features/dashboard/portal-storage-upload-card";
import { findSubmittedPortalDocument } from "@/lib/partner-portal-document";
import { submissionItemsForPartner } from "@/lib/partner-portal-docs";
import { hasAllocatedPanelSlots } from "@/lib/panel-discussion-visibility";
import {
  findPortalSpeakerInPartner,
  speakerHasPersistedPhoto,
  speakerPhotoIfMatchTokenForUpload,
} from "@/lib/partner-portal-speaker";
import { uploadSpeakerPhotoWithStorage } from "@/lib/portal-storage-upload";
import { SMS_CONTENT_MAX_LENGTH } from "@/lib/sms-content";
import {
  PORTAL_DOCUMENT_FORMAT_LABEL,
  PORTAL_SPEAKER_PHOTO_ACCEPT,
  PORTAL_SPEAKER_PHOTO_FORMAT_LABEL,
  UPLOAD_INTERRUPTED_MESSAGE,
  validateUploadFile,
} from "@/lib/upload-policy";
import { validateLinkedInProfile } from "@/lib/linkedin-profile";
import { isValidIndianMobile, normalizeIndianMobile } from "@/lib/phone";
import { useSpeakerPhotoUrl } from "@/lib/use-portal-media-url";
import type {
  EventPackageSummary,
  Partner,
  PartnerSeminarSpeakerDetail,
} from "@/lib/types";
import { PhoneField } from "@/features/dashboard/phone-field";

export function SubmissionsSection({
  partner,
  packages,
  uploadStatus,
  saving,
  onSaveText,
  onSaveSpeakers,
  onAdCreativeCommitted,
  onStorageCommitted,
}: {
  partner: Partner;
  packages: EventPackageSummary[];
  uploadStatus: {
    completed: number;
    total: number;
    progress: number;
    missing: Array<{ key: string; label: string }>;
  };
  saving: boolean;
  onSaveText: (
    field: "portalFasciaName" | "portalWebsiteUrl" | "portalSmsContent",
    value: string
  ) => Promise<void>;
  onSaveSpeakers: (
    eventId: string,
    seminarId: string,
    speakers: PartnerSeminarSpeakerDetail[]
  ) => Promise<void>;
  onAdCreativeCommitted: (partner: Partner) => void;
  onStorageCommitted: (partner: Partner) => void;
}) {
  const seminars = packages.flatMap((pkg) =>
    pkg.seminars.map((s) => ({
      ...s,
      eventId: pkg.eventId,
      eventTitle: pkg.title,
    }))
  );

  return (
    <section className="cu-panel flex h-full flex-col">
      <div className="mb-6">
        <p className="cu-eyebrow">Action checklist</p>
        <h2 className="mt-3 font-display text-[1.85rem] font-bold tracking-tight">
          What we need from you
        </h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">
          Share these details so production can prepare venue branding, souvenir,
          and panel discussion rosters.
        </p>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-ink-soft">
              Checklist progress
            </span>
            <span className="tabular-nums font-bold text-ink">
              {uploadStatus.completed}/{uploadStatus.total}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cu-red to-cu-yellow transition-[width] duration-700 ease-out"
              style={{
                width: `${Math.round(uploadStatus.progress * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {submissionItemsForPartner(partner).map((item) => {
          if (item.type === "text" || item.type === "url") {
            const value =
              item.field === "portalFasciaName"
                ? partner.portalFasciaName ?? ""
                : partner.portalWebsiteUrl ?? "";
            const done = Boolean(value.trim());
            return (
              <TextFieldCard
                key={item.key}
                icon={item.type === "url" ? Link2 : Type}
                label={item.label}
                done={done}
                value={value}
                placeholder={
                  item.type === "url"
                    ? "https://www.youruniversity.edu"
                    : "e.g. CHRIST (DEEMED TO BE UNIVERSITY)"
                }
                type={item.type === "url" ? "url" : "text"}
                saving={saving}
                onSave={(v) => onSaveText(item.field, v)}
              />
            );
          }

          if (item.type === "textarea") {
            const value = partner.portalSmsContent ?? "";
            return (
              <TextAreaCard
                key={item.key}
                label={item.label}
                done={Boolean(value.trim())}
                value={value}
                saving={saving}
                onSave={(v) => onSaveText("portalSmsContent", v)}
              />
            );
          }

          if (item.type === "file") {
            const doc = findSubmittedPortalDocument(
              partner.portalDocuments,
              item.docKind
            );
            if (item.docKind === "ad_creative") {
              return (
                <AdCreativeUploadCard
                  key={item.key}
                  label={item.label}
                  doc={doc}
                  onCommitted={onAdCreativeCommitted}
                />
              );
            }
            return (
              <PortalStorageUploadCard
                key={item.key}
                kind="souvenir_writeup"
                label={item.label}
                doc={doc}
                accept={item.accept}
                helperText={
                  "templateUrl" in item && item.templateUrl
                    ? `Download the format below, fill it in, then upload here (${PORTAL_DOCUMENT_FORMAT_LABEL})`
                    : `Click or drag a file here (${PORTAL_DOCUMENT_FORMAT_LABEL})`
                }
                templateUrl={"templateUrl" in item ? item.templateUrl : undefined}
                templateLabel={
                  "templateLabel" in item ? item.templateLabel : undefined
                }
                onCommitted={onStorageCommitted}
              />
            );
          }

          if (item.type === "speakers") {
            if (!hasAllocatedPanelSlots(packages)) return null;
            return (
              <div key={item.key} className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Mic2 className="h-4 w-4 text-cu-red" />
                  {item.label}
                </p>
                {seminars.map((seminar) => {
                  const existing = partner.portalSeminarSpeakers?.find(
                    (r) =>
                      r.eventId === seminar.eventId &&
                      r.seminarId === seminar.id
                  );
                  return (
                    <SpeakerCard
                      key={seminar.id}
                      partner={partner}
                      eventId={seminar.eventId}
                      seminarId={seminar.id}
                      seminarTitle={seminar.title}
                      eventTitle={seminar.eventTitle}
                      seats={seminar.slots}
                      initialSpeakers={existing?.speakers ?? []}
                      saving={saving}
                      onSave={(speakers) =>
                        onSaveSpeakers(seminar.eventId, seminar.id, speakers)
                      }
                      onPhotoCommitted={onStorageCommitted}
                    />
                  );
                })}
              </div>
            );
          }

          return null;
        })}
      </div>
    </section>
  );
}

function TextFieldCard({
  icon: Icon,
  label,
  done,
  value,
  placeholder,
  type,
  saving,
  onSave,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  done: boolean;
  value: string;
  placeholder: string;
  type: "text" | "url";
  saving: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const dirty = draft.trim() !== value.trim();

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 transition ${
        done
          ? "border-cu-green/25 bg-cu-green-soft/40"
          : "border-line bg-paper"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-cu-red" />
          <p className="text-sm font-semibold text-ink">{label}</p>
        </div>
        {done ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cu-green">
            <Check className="h-3 w-3" strokeWidth={3} /> Saved
          </span>
        ) : null}
      </div>
      <input
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="cu-input"
      />
      {dirty ? (
        <button
          type="button"
          disabled={saving || !draft.trim()}
          onClick={() => void onSave(draft.trim())}
          className="mt-2 h-9 rounded-full bg-cu-red px-4 text-xs font-bold text-white disabled:opacity-50"
        >
          Save
        </button>
      ) : null}
    </div>
  );
}

function TextAreaCard({
  label,
  done,
  value,
  saving,
  onSave,
}: {
  label: string;
  done: boolean;
  value: string;
  saving: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const dirty = draft.trim() !== value.trim();

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div
      className={`rounded-2xl border px-4 py-3.5 ${
        done
          ? "border-cu-green/25 bg-cu-green-soft/40"
          : "border-line bg-paper"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-cu-red" />
          <p className="text-sm font-semibold text-ink">{label}</p>
        </div>
        {done ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cu-green">
            <Check className="h-3 w-3" strokeWidth={3} /> Saved
          </span>
        ) : null}
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        maxLength={SMS_CONTENT_MAX_LENGTH}
        placeholder="SMS text for participant mailers"
        className="w-full resize-y rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-cu-blue focus:ring-2 focus:ring-cu-blue/15"
      />
      <p className="mt-1 text-[11px] tabular-nums text-ink-muted">
        {draft.length} / {SMS_CONTENT_MAX_LENGTH}
      </p>
      {dirty ? (
        <button
          type="button"
          disabled={saving || !draft.trim()}
          onClick={() => void onSave(draft.trim())}
          className="mt-2 h-9 rounded-full bg-cu-red px-4 text-xs font-bold text-white disabled:opacity-50"
        >
          Save
        </button>
      ) : null}
    </div>
  );
}

function SpeakerCard({
  partner,
  eventId,
  seminarId,
  seminarTitle,
  eventTitle,
  seats,
  initialSpeakers,
  saving,
  onSave,
  onPhotoCommitted,
}: {
  partner: Partner;
  eventId: string;
  seminarId: string;
  seminarTitle: string;
  eventTitle: string;
  seats: number;
  initialSpeakers: PartnerSeminarSpeakerDetail[];
  saving: boolean;
  onSave: (speakers: PartnerSeminarSpeakerDetail[]) => Promise<void>;
  onPhotoCommitted: (partner: Partner) => void;
}) {
  const normalizeSpeaker = (
    s: PartnerSeminarSpeakerDetail
  ): PartnerSeminarSpeakerDetail => ({
    id: s.id,
    name: s.name ?? "",
    designation: s.designation ?? "",
    contact: normalizeIndianMobile(
      s.contact ?? s.phone ?? ""
    ),
    introduction: s.introduction ?? "",
    photoUrl: s.photoUrl ?? "",
    photoStorageProvider: s.photoStorageProvider,
    photoStorageBucket: s.photoStorageBucket,
    photoStoragePath: s.photoStoragePath,
    photoFileName: s.photoFileName,
    photoMimeType: s.photoMimeType,
    photoFileSizeBytes: s.photoFileSizeBytes,
    photoUploadedAt: s.photoUploadedAt,
    linkedinProfile: s.linkedinProfile ?? "",
  });

  const emptySeats = () =>
    Array.from({ length: seats }, () => ({
      name: "",
      designation: "",
      contact: "",
      introduction: "",
      photoUrl: "",
      linkedinProfile: "",
    }));

  const [speakers, setSpeakers] = useState<PartnerSeminarSpeakerDetail[]>(() =>
    initialSpeakers.length
      ? initialSpeakers.map(normalizeSpeaker)
      : emptySeats()
  );
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [draftLocked, setDraftLocked] = useState(false);

  useEffect(() => {
    if (draftLocked) return;
    setSpeakers(
      initialSpeakers.length
        ? initialSpeakers.map(normalizeSpeaker)
        : emptySeats()
    );
    setAttemptedSave(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSpeakers, draftLocked]);

  const speakerComplete = (s: PartnerSeminarSpeakerDetail) =>
    Boolean(
      s.name.trim() &&
        s.designation?.trim() &&
        isValidIndianMobile(s.contact ?? "") &&
        s.introduction?.trim() &&
        speakerHasPersistedPhoto(s)
    );

  const savedDone = initialSpeakers.some(speakerComplete);
  const canSave = speakers.some(speakerComplete);

  const dirty =
    JSON.stringify(speakers.map(normalizeSpeaker)) !==
    JSON.stringify(
      (initialSpeakers.length ? initialSpeakers : emptySeats()).map(
        normalizeSpeaker
      )
    );

  const patchSpeaker = (
    index: number,
    patch: Partial<PartnerSeminarSpeakerDetail>
  ) => {
    setDraftLocked(true);
    setSpeakers((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const [photoUploading, setPhotoUploading] = useState<number | null>(null);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [localPreviews, setLocalPreviews] = useState<Record<number, string>>({});
  const partnerRef = useRef(partner);
  partnerRef.current = partner;

  const applyCommittedSpeakerPhoto = (
    index: number,
    source: Partner,
    speakerId?: string,
    upload?: {
      speakerId: string;
      storageBucket: string;
      storagePath: string;
      mimeType: string;
      fileSizeBytes: number;
      fileName: string;
    }
  ) => {
    const committed = speakerId
      ? findPortalSpeakerInPartner(source, eventId, seminarId, speakerId)
      : undefined;
    if (committed) {
      patchSpeaker(index, {
        ...normalizeSpeaker(committed),
        id: committed.id ?? upload?.speakerId,
      });
      return;
    }
    if (!upload) return;
    patchSpeaker(index, {
      id: upload.speakerId,
      photoUrl: "",
      photoStorageProvider: "supabase",
      photoStorageBucket: upload.storageBucket,
      photoStoragePath: upload.storagePath,
      photoFileName: upload.fileName,
      photoMimeType: upload.mimeType,
      photoFileSizeBytes: upload.fileSizeBytes,
      photoUploadedAt: new Date().toISOString(),
    });
  };

  const handlePhoto = async (index: number, file?: File) => {
    if (!file || photoUploading !== null) return;
    const error = validateUploadFile({
      fileName: file.name,
      fileSizeBytes: file.size,
      kind: "speaker_photo",
      mimeType: file.type,
    });
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    const preview = URL.createObjectURL(file);
    setLocalPreviews((prev) => ({ ...prev, [index]: preview }));
    setDraftLocked(true);
    setPhotoUploading(index);
    setPhotoProgress(0);
    const current = speakers[index];
    const ifMatchTokenAtUploadStart = speakerPhotoIfMatchTokenForUpload(
      partnerRef.current,
      eventId,
      seminarId,
      current?.id,
      current
    );
    const result = await uploadSpeakerPhotoWithStorage({
      file,
      eventId,
      seminarId,
      speakerId: current?.id,
      ifMatchToken: ifMatchTokenAtUploadStart,
      onProgress: setPhotoProgress,
      onRetry: () => setFormError(UPLOAD_INTERRUPTED_MESSAGE),
    });
    setPhotoUploading(null);
    if (!result.ok) {
      setFormError(result.error);
      setLocalPreviews((prev) => {
        const next = { ...prev };
        const currentPreview = next[index];
        if (currentPreview) URL.revokeObjectURL(currentPreview);
        delete next[index];
        return next;
      });
      if (result.partner) {
        onPhotoCommitted(result.partner);
        applyCommittedSpeakerPhoto(index, result.partner, current?.id);
      }
      return;
    }
    setFormError(null);
    const committedPartner = result.partner ?? partnerRef.current;
    if (result.partner) onPhotoCommitted(result.partner);
    applyCommittedSpeakerPhoto(index, committedPartner, result.speakerId, {
      speakerId: result.speakerId,
      storageBucket: result.storageBucket,
      storagePath: result.storagePath,
      mimeType: result.mimeType,
      fileSizeBytes: result.fileSizeBytes,
      fileName: result.fileName,
    });
  };

  return (
    <div
      className={`rounded-2xl border-2 px-4 py-4 transition ${
        savedDone
          ? "border-cu-green/35 bg-cu-green-soft/30"
          : "border-line bg-paper"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">{seminarTitle}</p>
          <p className="text-xs text-ink-muted">
            {eventTitle} · {seats} speaker slot{seats === 1 ? "" : "s"}
          </p>
        </div>
        {savedDone ? (
          <Check className="h-4 w-4 shrink-0 text-cu-green" strokeWidth={3} />
        ) : null}
      </div>
      <div className="space-y-4">
        {speakers.map((speaker, i) => (
          <div
            key={i}
            className="space-y-2.5 rounded-xl border border-line bg-white p-3.5"
          >
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-cu-red">
              Speaker {i + 1}
            </p>

            <SpeakerPhotoField
              speaker={speaker}
              eventId={eventId}
              seminarId={seminarId}
              localPreview={localPreviews[i]}
              name={speaker.name}
              disabled={saving || photoUploading !== null}
              uploading={photoUploading === i}
              progress={photoUploading === i ? photoProgress : 0}
              onUpload={(file) => void handlePhoto(i, file)}
              onRemove={() => {
                setLocalPreviews((prev) => {
                  const next = { ...prev };
                  delete next[i];
                  return next;
                });
                patchSpeaker(i, {
                  photoUrl: "",
                  photoStorageProvider: undefined,
                  photoStorageBucket: undefined,
                  photoStoragePath: undefined,
                  photoFileName: undefined,
                  photoMimeType: undefined,
                  photoFileSizeBytes: undefined,
                  photoUploadedAt: undefined,
                });
              }}
            />

            <input
              placeholder="Name"
              value={speaker.name}
              onChange={(e) => patchSpeaker(i, { name: e.target.value })}
              className="cu-input !h-10"
            />
            <input
              placeholder="Designation"
              value={speaker.designation ?? ""}
              onChange={(e) => patchSpeaker(i, { designation: e.target.value })}
              className="cu-input !h-10"
            />
            <PhoneField
              value={speaker.contact ?? ""}
              showError={attemptedSave}
              onChange={(phone) => patchSpeaker(i, { contact: phone })}
            />
            <input
              placeholder="LinkedIn Profile"
              value={speaker.linkedinProfile ?? ""}
              onChange={(e) =>
                patchSpeaker(i, { linkedinProfile: e.target.value })
              }
              className="cu-input !h-10"
            />
            <div>
              <textarea
                placeholder="Introduction — brief bio for the panel discussion"
                value={speaker.introduction ?? ""}
                maxLength={500}
                rows={4}
                onChange={(e) =>
                  patchSpeaker(i, { introduction: e.target.value })
                }
                className="w-full resize-y rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-cu-blue"
              />
              <p className="mt-1 text-right text-[11px] tabular-nums text-ink-muted">
                {(speaker.introduction ?? "").length}/500
              </p>
            </div>
          </div>
        ))}
      </div>
      {dirty ? (
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            setAttemptedSave(true);
            if (!canSave) return;
            const invalid = speakers.find((speaker) => {
              const result = validateLinkedInProfile(speaker.linkedinProfile);
              return !result.ok;
            });
            if (invalid) {
              const result = validateLinkedInProfile(invalid.linkedinProfile);
              setFormError(result.ok ? null : result.error);
              return;
            }
            setFormError(null);
            const payload = speakers
              .filter(speakerComplete)
              .map((s) => {
                const linkedIn = validateLinkedInProfile(s.linkedinProfile);
                return {
                  ...s,
                  contact: normalizeIndianMobile(s.contact ?? ""),
                  linkedinProfile: linkedIn.ok ? linkedIn.value : "",
                };
              });
            void onSave(payload)
              .then(() => setDraftLocked(false))
              .catch((error: unknown) => {
                setFormError(
                  error instanceof Error ? error.message : "Could not save speakers."
                );
              });
          }}
          className="mt-3 h-9 rounded-full bg-cu-red px-4 text-xs font-bold text-white disabled:opacity-50"
        >
          Save
        </button>
      ) : null}
      {formError ? (
        <p className="mt-2 text-xs font-semibold text-cu-red">{formError}</p>
      ) : null}
    </div>
  );
}

function SpeakerPhotoField({
  speaker,
  eventId,
  seminarId,
  localPreview,
  name,
  disabled,
  uploading,
  progress,
  onUpload,
  onRemove,
}: {
  speaker: PartnerSeminarSpeakerDetail;
  eventId: string;
  seminarId: string;
  localPreview?: string;
  name?: string;
  disabled?: boolean;
  uploading?: boolean;
  progress?: number;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { url: photoUrl, isResolving } = useSpeakerPhotoUrl(
    eventId,
    seminarId,
    speaker,
    localPreview
  );
  const hasPhoto =
    Boolean(photoUrl) || speakerHasPersistedPhoto(speaker) || isResolving;

  if (hasPhoto || uploading) {
    return (
      <div className="group relative mx-auto aspect-square w-28 overflow-hidden rounded-2xl border border-line bg-paper">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={name ? `${name} photo` : "Speaker photo"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-ink-muted">
            <ImagePlus className="h-6 w-6" />
            {isResolving && !uploading ? (
              <p className="mt-1 text-[10px] font-semibold">Loading photo…</p>
            ) : null}
          </div>
        )}
        {uploading ? (
          <div className="absolute inset-x-0 bottom-0 bg-ink/80 px-2 py-1.5">
            <p className="text-[10px] font-bold text-white">
              {progress && progress >= 100 ? "Verifying / Saving…" : `Uploading… ${progress ?? 0}%`}
            </p>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-300"
                style={{ width: `${progress ?? 0}%` }}
              />
            </div>
          </div>
        ) : null}
        <button
          type="button"
          disabled={disabled}
          aria-label="Remove photo"
          onClick={onRemove}
          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-ink/80 text-white opacity-0 transition hover:bg-cu-red group-hover:opacity-100 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
        {!uploading ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="absolute inset-x-0 bottom-0 bg-ink/75 py-1 text-[10px] font-bold text-white"
        >
          Change Photo
        </button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept={PORTAL_SPEAKER_PHOTO_ACCEPT}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      className="flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line-strong bg-paper px-3 py-4 transition hover:border-cu-red hover:bg-cu-red-soft/20 disabled:opacity-50"
    >
      <input
        ref={inputRef}
        type="file"
          accept={PORTAL_SPEAKER_PHOTO_ACCEPT}
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-cu-red-soft text-cu-red">
        <ImagePlus className="h-5 w-5" />
      </span>
      <span className="text-xs font-bold text-ink">Add photo</span>
      <span className="text-[10px] font-medium text-ink-muted">
        {PORTAL_SPEAKER_PHOTO_FORMAT_LABEL}
      </span>
    </button>
  );
}
