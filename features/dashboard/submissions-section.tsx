"use client";

import { useEffect, useState } from "react";
import {
  Check,
  FileUp,
  Link2,
  MessageSquare,
  Mic2,
  Type,
  Upload,
} from "lucide-react";

import { PORTAL_SUBMISSION_ITEMS } from "@/lib/partner-portal-docs";
import type {
  EventPackageSummary,
  Partner,
  PartnerSeminarSpeakerDetail,
} from "@/lib/types";

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
  saving,
  onSaveText,
  onUploadFile,
  onSaveSpeakers,
}: {
  partner: Partner;
  packages: EventPackageSummary[];
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
    <section className="flex h-full flex-col rounded-3xl border border-line-subtle bg-white p-5 shadow-card sm:p-6">
      <div className="mb-5">
        <h2 className="font-display text-xl font-bold text-brand-800">
          What we need from you
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Share these details so our production team can prepare venue branding,
          souvenir, and seminar rosters.
        </p>
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
                  className="rounded-2xl border border-dashed border-line-strong bg-paper-page px-4 py-4 text-sm text-ink-muted"
                >
                  {item.label} — available when seminar seats are allotted.
                </div>
              );
            }
            return (
              <div key={item.key} className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Mic2 className="h-4 w-4 text-brand-700" />
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
        done ? "border-success/30 bg-success-soft/20" : "border-line-subtle bg-paper-page"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-brand-700" />
          <p className="text-sm font-semibold text-ink">{label}</p>
        </div>
        {done ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success">
            <Check className="h-3 w-3" strokeWidth={3} /> Saved
          </span>
        ) : null}
      </div>
      <input
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-line-strong bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-700/10"
      />
      {dirty ? (
        <button
          type="button"
          disabled={saving || !draft.trim()}
          onClick={() => void onSave(draft.trim())}
          className="mt-2 h-9 rounded-full bg-brand-700 px-4 text-xs font-semibold text-white disabled:opacity-50"
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
        done ? "border-success/30 bg-success-soft/20" : "border-line-subtle bg-paper-page"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-brand-700" />
          <p className="text-sm font-semibold text-ink">{label}</p>
        </div>
        {done ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success">
            <Check className="h-3 w-3" strokeWidth={3} /> Saved
          </span>
        ) : null}
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        maxLength={320}
        placeholder="Short SMS copy for participant mailers (max 320 chars)…"
        className="w-full resize-y rounded-xl border border-line-strong bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-700/10"
      />
      <p className="mt-1 text-[11px] text-ink-muted">{draft.length}/320</p>
      {dirty ? (
        <button
          type="button"
          disabled={saving || !draft.trim()}
          onClick={() => void onSave(draft.trim())}
          className="mt-2 h-9 rounded-full bg-brand-700 px-4 text-xs font-semibold text-white disabled:opacity-50"
        >
          Save SMS
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
  saving,
  onUpload,
}: {
  label: string;
  accept: string;
  done: boolean;
  fileName?: string;
  saving: boolean;
  onUpload: (file: File) => Promise<void>;
}) {
  return (
    <label
      className={`block cursor-pointer rounded-2xl border-2 border-dashed px-4 py-4 transition hover:border-brand-500 hover:bg-brand-50/50 ${
        done
          ? "border-success/35 bg-success-soft/10"
          : "border-line-strong bg-paper-page"
      }`}
    >
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
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-700 shadow-sm">
          {done ? <FileUp className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {done && fileName
              ? `Uploaded · ${fileName}`
              : "Click or drop a file to upload"}
          </p>
        </div>
        {done ? (
          <Check className="h-4 w-4 shrink-0 text-success" strokeWidth={3} />
        ) : null}
      </div>
    </label>
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
    contact: s.contact ?? s.phone ?? s.email ?? "",
    introduction: s.introduction ?? "",
  });

  const [speakers, setSpeakers] = useState<PartnerSeminarSpeakerDetail[]>(() =>
    initialSpeakers.length
      ? initialSpeakers.map(normalizeSpeaker)
      : Array.from({ length: seats }, () => ({
          name: "",
          designation: "",
          contact: "",
          introduction: "",
        }))
  );

  useEffect(() => {
    if (initialSpeakers.length) {
      setSpeakers(initialSpeakers.map(normalizeSpeaker));
    }
  }, [initialSpeakers]);

  const done = speakers.some((s) => s.name.trim());

  const patchSpeaker = (
    index: number,
    patch: Partial<PartnerSeminarSpeakerDetail>
  ) => {
    setSpeakers((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  return (
    <div className="rounded-2xl border border-line-subtle bg-paper-page p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">{seminarTitle}</p>
          <p className="text-xs text-ink-muted">
            {eventTitle} · {seats} speaker slot{seats === 1 ? "" : "s"}
          </p>
        </div>
        {done ? (
          <span className="text-[11px] font-bold text-success">Saved</span>
        ) : null}
      </div>
      <div className="space-y-4">
        {speakers.map((speaker, i) => (
          <div
            key={i}
            className="space-y-2.5 rounded-xl border border-line-subtle bg-white p-3.5"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">
              Speaker {i + 1}
            </p>
            <input
              placeholder="Name *"
              value={speaker.name}
              onChange={(e) => patchSpeaker(i, { name: e.target.value })}
              className="h-10 w-full rounded-lg border border-line-strong px-3 text-sm outline-none focus:border-brand-500"
            />
            <input
              placeholder="Designation"
              value={speaker.designation ?? ""}
              onChange={(e) => patchSpeaker(i, { designation: e.target.value })}
              className="h-10 w-full rounded-lg border border-line-strong px-3 text-sm outline-none focus:border-brand-500"
            />
            <input
              placeholder="Contact (phone or email)"
              value={speaker.contact ?? ""}
              onChange={(e) => patchSpeaker(i, { contact: e.target.value })}
              className="h-10 w-full rounded-lg border border-line-strong px-3 text-sm outline-none focus:border-brand-500"
            />
            <div>
              <textarea
                placeholder="Introduction — brief bio for the seminar programme"
                value={speaker.introduction ?? ""}
                maxLength={1000}
                rows={4}
                onChange={(e) =>
                  patchSpeaker(i, { introduction: e.target.value })
                }
                className="w-full resize-y rounded-lg border border-line-strong px-3 py-2.5 text-sm outline-none focus:border-brand-500"
              />
              <p className="mt-1 text-right text-[11px] tabular-nums text-ink-muted">
                {(speaker.introduction ?? "").length}/1000
              </p>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={saving || !speakers.some((s) => s.name.trim())}
        onClick={() => void onSave(speakers.filter((s) => s.name.trim()))}
        className="mt-3 h-9 rounded-full bg-brand-700 px-4 text-xs font-semibold text-white disabled:opacity-50"
      >
        Save speakers
      </button>
    </div>
  );
}
