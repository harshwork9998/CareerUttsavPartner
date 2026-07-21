"use client";

import { Mic2 } from "lucide-react";

import { formatSeminarWhen } from "@/lib/partner-event-config";
import type { EventPackageSummary } from "@/lib/types";

export function SeminarSection({
  packages,
}: {
  packages: EventPackageSummary[];
}) {
  const allSeminars = packages.flatMap((pkg) =>
    pkg.seminars.map((s) => ({ ...s, eventTitle: pkg.title, city: pkg.city }))
  );

  return (
    <section className="rounded-3xl border border-line-subtle bg-white p-5 shadow-card sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <Mic2 className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold text-brand-800">
            Seminar details
          </h2>
          <p className="text-sm text-ink-secondary">
            Panelist seats allotted across your events.
          </p>
        </div>
      </div>

      {allSeminars.length === 0 ? (
        <div className="rounded-2xl bg-paper-muted px-4 py-4 text-sm leading-relaxed text-ink-secondary">
          No seminar seats were allotted for this partnership. Your package
          benefits still apply — focus on sharing the required brand assets.
        </div>
      ) : (
        <ul className="space-y-3">
          {allSeminars.map((seminar) => (
            <li
              key={`${seminar.id}-${seminar.eventTitle}`}
              className="rounded-2xl border border-line-subtle bg-paper-page px-4 py-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-ink">{seminar.title}</h3>
                <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold tabular-nums text-brand-700">
                  {seminar.slots} seat{seminar.slots === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {formatSeminarWhen(seminar)} · {seminar.city}
              </p>
              <p className="mt-1 text-[11px] font-medium text-ink-secondary">
                {seminar.eventTitle}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
