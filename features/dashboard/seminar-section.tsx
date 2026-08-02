"use client";

import { Mic2, MapPin } from "lucide-react";

import { formatSeminarWhen } from "@/lib/partner-event-config";
import type { EventPackageSummary } from "@/lib/types";

export function SeminarSection({
  packages,
}: {
  packages: EventPackageSummary[];
}) {
  const packagesWithSeminars = packages.filter((p) => p.seminars.length > 0);
  const totalSeats = packages.reduce((s, p) => s + p.seatsAssigned, 0);

  return (
    <section className="cu-panel">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="cu-eyebrow">Stage time</p>
          <h2 className="mt-3 flex items-center gap-2 font-display text-[1.85rem] font-bold tracking-tight">
            <Mic2 className="h-6 w-6 text-cu-red" />
            Seminar seats
          </h2>
          <p className="mt-2 text-sm font-medium text-ink-soft">
            Panelist seats allotted across your events.
          </p>
        </div>
        {totalSeats > 0 ? (
          <span className="rounded-full bg-cu-red-soft px-3.5 py-1.5 text-xs font-extrabold tabular-nums text-cu-red-dark">
            {totalSeats} seat{totalSeats === 1 ? "" : "s"} ·{" "}
            {packagesWithSeminars.length} event
            {packagesWithSeminars.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {packagesWithSeminars.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper-dim/70 px-5 py-5 text-sm leading-relaxed text-ink-soft">
          No seminar seats were allotted for this partnership. Your package
          benefits still apply — focus on sharing the required brand assets.
        </div>
      ) : (
        <div className="space-y-6">
          {packagesWithSeminars.map((pkg) => (
            <div key={pkg.eventId}>
              {packages.length > 1 ? (
                <div className="mb-3 flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-cu-red" />
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-cu-red">
                    {pkg.city}
                  </p>
                  <span className="text-ink-muted">·</span>
                  <p className="truncate text-xs font-semibold text-ink-soft">
                    {pkg.title}
                  </p>
                </div>
              ) : null}
              <ul className="space-y-3">
                {pkg.seminars.map((seminar) => (
                  <li
                    key={seminar.id}
                    className="rounded-2xl border border-line bg-paper px-5 py-4 transition hover:border-ink/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-lg font-bold leading-snug">
                        {seminar.title}
                      </h3>
                      <span className="shrink-0 rounded-full bg-ink px-3 py-1 text-xs font-bold tabular-nums text-white">
                        {seminar.slots} seat{seminar.slots === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-medium text-ink-muted">
                      {formatSeminarWhen(seminar)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
