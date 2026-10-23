"use client";

import { useEffect, useState } from "react";
import { Check, MapPin, Users } from "lucide-react";

import { PhoneField } from "@/features/dashboard/phone-field";
import {
  isValidIndianMobile,
  normalizeIndianMobile,
} from "@/lib/phone";
import {
  representativeFormCount,
} from "@/lib/representative-allocation";
import type {
  EventPackageSummary,
  Partner,
  PartnerRepresentative,
  PartnerRepresentativesSubmission,
} from "@/lib/types";

function visibleRepresentatives(
  allocation: number,
  saved?: PartnerRepresentativesSubmission
): PartnerRepresentative[] {
  const rows = saved?.representatives ?? [];
  return Array.from({ length: allocation }, (_, index) => ({
    name: rows[index]?.name ?? "",
    designation: rows[index]?.designation ?? "",
    phone: normalizeIndianMobile(rows[index]?.phone ?? ""),
  }));
}

function isComplete(
  allocation: number,
  representatives: PartnerRepresentative[]
) {
  const formCount = representativeFormCount(allocation);
  if (formCount < 1) return true;
  const visible = representatives.slice(0, formCount);
  if (visible.length !== formCount) return false;
  return visible.every(
    (row) =>
      row.name.trim().length > 0 &&
      Boolean(row.designation?.trim()) &&
      isValidIndianMobile(row.phone)
  );
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
  const [representatives, setRepresentatives] = useState(() =>
    visibleRepresentatives(allocation, savedSubmission)
  );
  const [attemptedSave, setAttemptedSave] = useState(false);

  useEffect(() => {
    setRepresentatives(visibleRepresentatives(allocation, savedSubmission));
    setAttemptedSave(false);
  }, [allocation, savedSubmission]);

  if (representativeFormCount(allocation) < 1) return null;

  const rowsForSave = representatives.slice(0, allocation);
  const savedVisible = visibleRepresentatives(allocation, savedSubmission);
  const savedDone = isComplete(allocation, savedVisible);
  const canSave = isComplete(allocation, rowsForSave);
  const dirty = JSON.stringify(rowsForSave) !== JSON.stringify(savedVisible);

  const patchRep = (index: number, patch: Partial<PartnerRepresentative>) => {
    setRepresentatives((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

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
            <div className="grid gap-3">
              <input
                type="text"
                placeholder="Name"
                value={rep.name}
                onChange={(e) => patchRep(i, { name: e.target.value })}
                className="cu-input !h-10"
              />
              <input
                type="text"
                placeholder="Designation"
                value={rep.designation ?? ""}
                onChange={(e) => patchRep(i, { designation: e.target.value })}
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
              count: allocation,
              representatives: rowsForSave.map((row) => ({
                name: row.name.trim(),
                designation: row.designation?.trim() ?? "",
                phone: normalizeIndianMobile(row.phone),
              })),
            });
          }}
          className="mt-4 h-10 rounded-full bg-cu-red px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          Save
        </button>
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
  const allDone =
    packages.length > 0 &&
    packages.every((pkg) => {
      const allocation = pkg.representativeSlotCount ?? 0;
      if (representativeFormCount(allocation) < 1) return true;
      return isComplete(
        allocation,
        visibleRepresentatives(
          allocation,
          submissions.find((row) => row.eventId === pkg.eventId)
        )
      );
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
            Tell us how many people from your team will attend Career Uttsav.
          </p>
        </div>
        {allDone && packages.some((pkg) => (pkg.representativeSlotCount ?? 0) > 0) ? (
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
              allocation={pkg.representativeSlotCount ?? 0}
              savedSubmission={submissions.find(
                (row) => row.eventId === pkg.eventId
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
