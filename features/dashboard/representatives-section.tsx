"use client";

import { useEffect, useState } from "react";
import { Check, MapPin, Users } from "lucide-react";

import { PhoneField } from "@/features/dashboard/phone-field";
import {
  isValidIndianMobile,
  normalizeIndianMobile,
} from "@/lib/phone";
import type {
  EventPackageSummary,
  Partner,
  PartnerRepresentative,
  PartnerRepresentativesSubmission,
} from "@/lib/types";

function emptyRep(): PartnerRepresentative {
  return { name: "", phone: "" };
}

function normalizeSubmission(
  value?: PartnerRepresentativesSubmission
): { count: number; representatives: PartnerRepresentative[] } {
  const count = Math.max(0, Math.floor(value?.count ?? 0));
  const rows = value?.representatives ?? [];
  const representatives = Array.from({ length: count }, (_, i) => ({
    name: rows[i]?.name ?? "",
    phone: normalizeIndianMobile(rows[i]?.phone ?? ""),
  }));
  return { count, representatives };
}

function isComplete(
  count: number,
  representatives: PartnerRepresentative[]
) {
  if (count < 1) return false;
  if (representatives.length !== count) return false;
  return representatives.every(
    (r) => r.name.trim().length > 0 && isValidIndianMobile(r.phone)
  );
}

function EventRepresentativesForm({
  eventId,
  city,
  title,
  showCityHeader,
  savedSubmission,
  saving,
  onSave,
}: {
  eventId: string;
  city: string;
  title: string;
  showCityHeader: boolean;
  savedSubmission?: PartnerRepresentativesSubmission;
  saving: boolean;
  onSave: (payload: {
    eventId: string;
    count: number;
    representatives: PartnerRepresentative[];
  }) => Promise<void>;
}) {
  const saved = normalizeSubmission(savedSubmission);
  const initialCount = saved.count || 1;
  const [countInput, setCountInput] = useState(String(initialCount));
  const [representatives, setRepresentatives] = useState(
    saved.representatives.length
      ? saved.representatives
      : [emptyRep()]
  );
  const [attemptedSave, setAttemptedSave] = useState(false);

  useEffect(() => {
    const next = normalizeSubmission(savedSubmission);
    const nextCount = next.count || 1;
    setCountInput(String(nextCount));
    setRepresentatives(
      next.representatives.length
        ? next.representatives
        : Array.from({ length: nextCount }, emptyRep)
    );
    setAttemptedSave(false);
  }, [savedSubmission]);

  const syncRepRows = (nextCount: number) => {
    const clamped = Math.max(1, nextCount);
    setRepresentatives((prev) => {
      if (prev.length === clamped) return prev;
      if (prev.length < clamped) {
        return [
          ...prev,
          ...Array.from({ length: clamped - prev.length }, emptyRep),
        ];
      }
      return prev.slice(0, clamped);
    });
  };

  const onCountChange = (raw: string) => {
    if (raw === "") {
      setCountInput("");
      return;
    }
    if (!/^\d+$/.test(raw)) return;
    setCountInput(raw);
    const parsed = Number(raw);
    if (parsed >= 1) syncRepRows(parsed);
  };

  const onCountBlur = () => {
    const parsed = Math.max(1, Math.floor(Number(countInput)) || 1);
    setCountInput(String(parsed));
    syncRepRows(parsed);
  };

  const patchRep = (
    index: number,
    patch: Partial<PartnerRepresentative>
  ) => {
    setRepresentatives((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const effectiveCount = Math.max(1, Math.floor(Number(countInput)) || 1);
  const rowsForSave = representatives.slice(0, effectiveCount);
  const savedDone = isComplete(saved.count, saved.representatives);
  const canSave = isComplete(effectiveCount, rowsForSave);
  const dirty =
    effectiveCount !== saved.count ||
    JSON.stringify(rowsForSave) !==
      JSON.stringify(saved.representatives);

  return (
    <div
      className={
        showCityHeader
          ? `rounded-2xl border p-4 sm:p-5 ${
              savedDone
                ? "border-cu-green/35 bg-cu-green-soft/20"
                : "border-line bg-paper"
            }`
          : ""
      }
    >
      {showCityHeader ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-cu-red" />
              <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-cu-red">
                {city}
              </p>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-ink-soft">
              {title}
            </p>
          </div>
          {savedDone ? (
            <Check className="h-5 w-5 shrink-0 text-cu-green" strokeWidth={3} />
          ) : null}
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-ink-soft">
            Number of representatives
            {showCityHeader ? ` · ${city}` : ""}
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={countInput}
            onChange={(e) => onCountChange(e.target.value)}
            onBlur={onCountBlur}
            className="cu-input !h-11 max-w-[140px]"
          />
        </div>

        <div className="space-y-3">
          {rowsForSave.map((rep, i) => (
            <div
              key={i}
              className={`rounded-2xl border border-line p-4 ${
                showCityHeader ? "bg-paper-dim/40" : "bg-paper"
              }`}
            >
              <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-cu-red">
                Representative {i + 1}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={rep.name}
                  onChange={(e) => patchRep(i, { name: e.target.value })}
                  className="cu-input !h-10"
                />
                <PhoneField
                  value={rep.phone}
                  showError={attemptedSave}
                  onChange={(phone) => patchRep(i, { phone })}
                />
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
              void onSave({
                eventId,
                count: effectiveCount,
                representatives: rowsForSave.map((r) => ({
                  name: r.name.trim(),
                  phone: normalizeIndianMobile(r.phone),
                })),
              });
            }}
            className="h-10 rounded-full bg-cu-red px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            Save
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function RepresentativesSection({
  partner,
  packages,
  saving,
  onSave,
}: {
  partner: Partner;
  packages: EventPackageSummary[];
  saving: boolean;
  onSave: (payload: {
    eventId: string;
    count: number;
    representatives: PartnerRepresentative[];
  }) => Promise<void>;
}) {
  const multiCity = packages.length > 1;
  const submissions = partner.portalRepresentatives ?? [];

  const allDone =
    packages.length > 0 &&
    packages.every((pkg) => {
      const saved = normalizeSubmission(
        submissions.find((s) => s.eventId === pkg.eventId)
      );
      return isComplete(saved.count, saved.representatives);
    });

  return (
    <section
      className={`cu-panel transition ${
        allDone && !multiCity ? "border-cu-green/35 bg-cu-green-soft/20" : ""
      }`}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="cu-eyebrow">On ground</p>
          <h2 className="mt-3 flex items-center gap-2 font-display text-[1.85rem] font-bold tracking-tight">
            <Users className="h-6 w-6 text-cu-red" />
            Event representatives
          </h2>
          <p className="mt-2 text-sm font-medium text-ink-soft">
            {multiCity
              ? "Tell us who from your team will attend each city edition, with a name and phone number for each, so we can plan arrangements."
              : "Tell us how many people from your team will attend Career Uttsav, with a name and phone number for each, so we can plan arrangements."}
          </p>
        </div>
        {allDone ? (
          <Check className="h-5 w-5 shrink-0 text-cu-green" strokeWidth={3} />
        ) : null}
      </div>

      {packages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper-dim/70 px-5 py-5 text-sm leading-relaxed text-ink-soft">
          No events are linked to this partnership yet, so representatives
          cannot be submitted.
        </div>
      ) : (
        <div className={multiCity ? "space-y-5" : "space-y-4"}>
          {packages.map((pkg) => (
            <EventRepresentativesForm
              key={pkg.eventId}
              eventId={pkg.eventId}
              city={pkg.city}
              title={pkg.title}
              showCityHeader={multiCity}
              savedSubmission={submissions.find(
                (s) => s.eventId === pkg.eventId
              )}
              saving={saving}
              onSave={onSave}
            />
          ))}
        </div>
      )}
    </section>
  );
}
