"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Download,
  FileUp,
  ImagePlus,
  Link2,
  MessageSquare,
  Mic2,
  Type,
  Upload,
  X,
} from "lucide-react";

import { PORTAL_SUBMISSION_ITEMS } from "@/lib/partner-portal-docs";
import { isValidIndianMobile, normalizeIndianMobile } from "@/lib/phone";
import { readFileAsDataUrl } from "@/lib/utils";
import type {
  EventPackageSummary,
  Partner,
  PartnerSeminarSpeakerDetail,
} from "@/lib/types";
import { PhoneField } from "@/features/dashboard/phone-field";

function findSubmissionDoc(
  partner: Partner,
  kind: "souvenir_writeup" | "ad_creative"
) {
  return partner.portalDocuments?.find(
    (d) =>
      d.kind === kind || (kind === "souvenir_writeup" && d.kind === "writeup")
  );
}

export function SubmissionsSection({
  partner,
  packages,
  uploadStatus,
  saving,
  onSaveText,
  onUploadFile,
  onSaveSpeakers,
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
  onUploadFile: (
    kind: "souvenir_writeup" | "ad_creative",
    label: string,
    file: File
  ) => Promise<void>;
  onSaveSpeakers: (
    eventId: string,
    seminarId: string,
    speakers: PartnerSeminarSpeakerDetail[]
  ) => Promise<void>;
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
          and seminar rosters.
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
        {PORTAL_SUBMISSION_ITEMS.map((item) => {
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
            const doc = findSubmissionDoc(partner, item.docKind);
            return (
              <FileUploadCard
                key={item.key}
                label={item.label}
                accept={item.accept}
                done={Boolean(doc)}
                fileName={doc?.fileName}
                templateUrl={"templateUrl" in item ? item.templateUrl : undefined}
                templateLabel={
                  "templateLabel" in item ? item.templateLabel : undefined
                }
                saving={saving}
                onUpload={(file) =>
                  onUploadFile(item.docKind, item.label, file)
                }
              />
            );
          }

          if (item.type === "speakers") {
            if (seminars.length === 0) {
              return (
                <div
                  key={item.key}
                  className="rounded-2xl border border-dashed border-line bg-paper-dim/60 px-4 py-4 text-sm text-ink-muted"
                >
                  {item.label} — available when seminar seats are allotted.
                </div>
              );
            }
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
                      seminarTitle={seminar.title}
                      eventTitle={seminar.eventTitle}
                      seats={seminar.slots}
                      initialSpeakers={existing?.speakers ?? []}
                      saving={saving}
                      onSave={(speakers) =>
                        onSaveSpeakers(seminar.eventId, seminar.id, speakers)
                      }
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
        maxLength={500}
        placeholder="SMS text for participant mailers (max 500 characters)"
        className="w-full resize-y rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-cu-blue focus:ring-2 focus:ring-cu-blue/15"
      />
      <p className="mt-1 text-[11px] text-ink-muted">{draft.length}/500</p>
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

function FileUploadCard({
  label,
  accept,
  done,
  fileName,
  templateUrl,
  templateLabel,
  saving,
  onUpload,
}: {
  label: string;
  accept: string;
  done: boolean;
  fileName?: string;
  templateUrl?: string;
  templateLabel?: string;
  saving: boolean;
  onUpload: (file: File) => Promise<void>;
}) {
  return (
    <div
      className={`rounded-2xl border-2 border-dashed px-4 py-4 transition ${
        done
          ? "border-cu-green/35 bg-cu-green-soft/30"
          : "border-line-strong bg-paper"
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3 transition hover:opacity-95">
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled={saving}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onUpload(file);
          }}
        />
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-cu-red shadow-sm">
          {done ? <FileUp className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {done && fileName
              ? `Uploaded · ${fileName}`
              : templateUrl
                ? "Download the format below, fill it in, then upload here"
                : "Click or drop a file to upload"}
          </p>
        </div>
        {done ? (
          <Check className="h-4 w-4 shrink-0 text-cu-green" strokeWidth={3} />
        ) : null}
      </label>
      {templateUrl ? (
        <a
          href={templateUrl}
          download="Career-Uttsav-Souvenir-Write-Up-Format.docx"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-cu-blue transition hover:text-cu-blue-dark"
          onClick={(e) => e.stopPropagation()}
        >
          <Download className="h-3.5 w-3.5" />
          {templateLabel ?? "Download format"}
        </a>
      ) : null}
    </div>
  );
}

function SpeakerCard({
  seminarTitle,
  eventTitle,
  seats,
  initialSpeakers,
  saving,
  onSave,
}: {
  seminarTitle: string;
  eventTitle: string;
  seats: number;
  initialSpeakers: PartnerSeminarSpeakerDetail[];
  saving: boolean;
  onSave: (speakers: PartnerSeminarSpeakerDetail[]) => Promise<void>;
}) {
  const normalizeSpeaker = (
    s: PartnerSeminarSpeakerDetail
  ): PartnerSeminarSpeakerDetail => ({
    name: s.name ?? "",
    designation: s.designation ?? "",
    contact: normalizeIndianMobile(
      s.contact ?? s.phone ?? ""
    ),
    introduction: s.introduction ?? "",
    photoUrl: s.photoUrl ?? "",
  });

  const emptySeats = () =>
    Array.from({ length: seats }, () => ({
      name: "",
      designation: "",
      contact: "",
      introduction: "",
      photoUrl: "",
    }));

  const [speakers, setSpeakers] = useState<PartnerSeminarSpeakerDetail[]>(() =>
    initialSpeakers.length
      ? initialSpeakers.map(normalizeSpeaker)
      : emptySeats()
  );
  const [attemptedSave, setAttemptedSave] = useState(false);

  useEffect(() => {
    setSpeakers(
      initialSpeakers.length
        ? initialSpeakers.map(normalizeSpeaker)
        : emptySeats()
    );
    setAttemptedSave(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSpeakers]);

  const speakerComplete = (s: PartnerSeminarSpeakerDetail) =>
    Boolean(
      s.name.trim() &&
        s.designation?.trim() &&
        isValidIndianMobile(s.contact ?? "") &&
        s.introduction?.trim() &&
        s.photoUrl?.trim()
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
    setSpeakers((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const handlePhoto = async (index: number, file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const photoUrl = await readFileAsDataUrl(file);
    patchSpeaker(index, { photoUrl });
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
              photoUrl={speaker.photoUrl}
              name={speaker.name}
              disabled={saving}
              onUpload={(file) => void handlePhoto(i, file)}
              onRemove={() => patchSpeaker(i, { photoUrl: "" })}
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
            <div>
              <textarea
                placeholder="Introduction — brief bio for the seminar programme"
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
            void onSave(
              speakers
                .filter(speakerComplete)
                .map((s) => ({
                  ...s,
                  contact: normalizeIndianMobile(s.contact ?? ""),
                }))
            );
          }}
          className="mt-3 h-9 rounded-full bg-cu-red px-4 text-xs font-bold text-white disabled:opacity-50"
        >
          Save
        </button>
      ) : null}
    </div>
  );
}

function SpeakerPhotoField({
  photoUrl,
  name,
  disabled,
  onUpload,
  onRemove,
}: {
  photoUrl?: string;
  name?: string;
  disabled?: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (photoUrl) {
    return (
      <div className="group relative mx-auto aspect-square w-28 overflow-hidden rounded-2xl border border-line bg-paper">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt={name ? `${name} photo` : "Speaker photo"}
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          disabled={disabled}
          aria-label="Remove photo"
          onClick={onRemove}
          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-ink/80 text-white opacity-0 transition hover:bg-cu-red group-hover:opacity-100 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="absolute inset-x-0 bottom-0 bg-ink/75 py-1 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100"
        >
          Edit
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
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
        accept="image/png,image/jpeg,image/webp"
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
      <span className="text-[11px] text-ink-muted">PNG or JPG</span>
    </button>
  );
}
