"use client";

import { useEffect, useState } from "react";
import { Check, MapPin, Users, X } from "lucide-react";

import { PhoneField } from "@/features/dashboard/phone-field";
import { isValidIndianMobile, normalizeIndianMobile } from "@/lib/phone";
import {
  canAddRepresentative,
  collectRepresentativeSubmission,
  initialRepresentativeRows,
  isBlankRepresentative,
} from "@/lib/representative-allocation";
import type {
  EventPackageSummary,
  Partner,
  PartnerRepresentative,
  PartnerRepresentativesSubmission,
} from "@/lib/types";

function emptyRepresentative(): PartnerRepresentative {
  return { name: "", designation: "", phone: "" };
}

function savedPeople(
  saved?: PartnerRepresentativesSubmission
): PartnerRepresentative[] {
  return (saved?.representatives ?? [])
    .filter((row) => !isBlankRepresentative(row))
    .map((row) => ({
      name: row.name,
      designation: row.designation ?? "",
      phone: normalizeIndianMobile(row.phone),
    }));
}

function EventRepresentativesForm({
  eventId,
  city,
  title,
  showCityHeader,
  allocation,
  savedSubmission,
  saving,
  onSave,
}: {
  eventId: string;
  city: string;
  title: string;
  showCityHeader: boolean;
  allocation: number;
  savedSubmission?: PartnerRepresentativesSubmission;
  saving: boolean;
  onSave: (payload: {
    eventId: string;
    count: number;
    representatives: PartnerRepresentative[];
  }) => Promise<void>;
}) {
  const [representatives, setRepresentatives] = useState<PartnerRepresentative[]>(() =>
    initialRepresentativeRows(allocation, savedSubmission?.representatives)
  );
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setRepresentatives(
      initialRepresentativeRows(allocation, savedSubmission?.representatives)
    );
    setAttemptedSave(false);
    setFormError(null);
  }, [allocation, savedSubmission]);

  if (allocation < 1) return null;

  const saved = savedPeople(savedSubmission);
  const dirty =
    JSON.stringify(representatives) !==
    JSON.stringify(
      initialRepresentativeRows(allocation, savedSubmission?.representatives)
    );
  const filled = representatives.filter((row) => !isBlankRepresentative(row)).length;

  const patchRep = (index: number, patch: Partial<PartnerRepresentative>) => {
    setFormError(null);
    setRepresentatives((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  return (
    <div className={showCityHeader ? "rounded-2xl border border-line bg-paper p-4" : ""}>
      {showCityHeader ? (
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-cu-red" />
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-cu-red">
            {city}
          </p>
          <span className="truncate text-xs font-semibold text-ink-soft">{title}</span>
        </div>
      ) : null}

      <div className="divide-y divide-line sm:divide-y-0">
        {representatives.map((rep, index) => {
          const partial = attemptedSave && !isBlankRepresentative(rep);
          const nameMissing = partial && !rep.name.trim();
          const designationMissing = partial && !rep.designation?.trim();
          return (
            <div
              key={index}
              className="grid grid-cols-1 gap-2 py-2.5 sm:grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_1.75rem] sm:items-start sm:gap-2 sm:py-1.5"
            >
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-cu-red sm:pt-3 sm:text-xs sm:normal-case sm:tracking-normal">
                <span className="sm:hidden">Representative {index + 1}</span>
                <span className="hidden sm:inline">{index + 1}</span>
              </p>
              <input
                type="text"
                aria-label={`Representative ${index + 1} name`}
                placeholder="Name"
                value={rep.name}
                onChange={(e) => patchRep(index, { name: e.target.value })}
                className={`cu-input !h-10${nameMissing ? " !border-cu-red" : ""}`}
              />
              <input
                type="text"
                aria-label={`Representative ${index + 1} designation`}
                placeholder="Designation"
                value={rep.designation ?? ""}
                onChange={(e) => patchRep(index, { designation: e.target.value })}
                className={`cu-input !h-10${designationMissing ? " !border-cu-red" : ""}`}
              />
              <PhoneField
                value={rep.phone}
                showError={partial}
                onChange={(phone) => patchRep(index, { phone })}
              />
              <button
                type="button"
                aria-label={`Remove representative ${index + 1}`}
                onClick={() => {
                  setFormError(null);
                  setRepresentatives((prev) => prev.filter((_, i) => i !== index));
                }}
                className="grid h-10 w-7 place-items-center justify-self-end text-ink-muted transition hover:text-cu-red sm:justify-self-center"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium tabular-nums text-ink-muted">
          {filled} / {allocation} representatives
        </p>
        {canAddRepresentative(representatives.length, allocation) ? (
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setRepresentatives((prev) => [...prev, emptyRepresentative()]);
            }}
            className="h-8 rounded-full px-3 text-xs font-bold text-cu-red transition hover:bg-cu-red-soft"
          >
            + Add representative
          </button>
        ) : null}
      </div>

      {dirty || formError ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {dirty ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setAttemptedSave(true);
                const result = collectRepresentativeSubmission(
                  representatives,
                  allocation,
                  isValidIndianMobile
                );
                if (!result.ok) {
                  setFormError(result.error);
                  return;
                }
                setFormError(null);
                void onSave({
                  eventId,
                  count: result.representatives.length,
                  representatives: result.representatives,
                });
              }}
              className="h-9 rounded-full bg-cu-red px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              Save
            </button>
          ) : null}
          {formError ? (
            <p className="text-xs font-semibold text-cu-red">{formError}</p>
          ) : null}
        </div>
      ) : null}
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
  const hasSavedPeople = packages.some((pkg) =>
    savedPeople(submissions.find((row) => row.eventId === pkg.eventId)).some(
      (row) =>
        row.name.trim() &&
        Boolean(row.designation?.trim()) &&
        isValidIndianMobile(row.phone)
    )
  );

  return (
    <section
      className={`cu-panel transition ${
        hasSavedPeople && !multiCity ? "border-cu-green/35 bg-cu-green-soft/20" : ""
      }`}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="cu-eyebrow">On ground</p>
          <h2 className="mt-3 flex items-center gap-2 font-display text-[1.85rem] font-bold tracking-tight">
            <Users className="h-6 w-6 text-cu-red" />
            Event representatives
          </h2>
          <p className="mt-2 text-sm font-medium text-ink-soft">
            Tell us how many people from your team will attend Career Uttsav.
          </p>
        </div>
        {hasSavedPeople ? (
          <Check className="h-5 w-5 shrink-0 text-cu-green" strokeWidth={3} />
        ) : null}
      </div>

      {packages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper-dim/70 px-5 py-5 text-sm leading-relaxed text-ink-soft">
          No events are linked to this partnership yet, so representatives
          cannot be submitted.
        </div>
      ) : (
        <div className={multiCity ? "space-y-5" : ""}>
          {packages.map((pkg) => (
            <EventRepresentativesForm
              key={pkg.eventId}
              eventId={pkg.eventId}
              city={pkg.city}
              title={pkg.title}
              showCityHeader={multiCity}
              allocation={pkg.representativeSlotCount ?? 0}
              savedSubmission={submissions.find((row) => row.eventId === pkg.eventId)}
              saving={saving}
              onSave={onSave}
            />
          ))}
        </div>
      )}
    </section>
  );
}
