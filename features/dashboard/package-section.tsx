"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";

import type { EventPackageSummary } from "@/lib/types";

export function PackageSection({
  packages,
}: {
  packages: EventPackageSummary[];
}) {
  if (packages.length === 0) {
    return (
      <section className="cu-panel">
        <p className="cu-eyebrow">Your package</p>
        <h2 className="mt-4 font-display text-3xl font-bold tracking-tight">
          Partner package
        </h2>
        <p className="mt-3 text-ink-soft">No event packages linked yet.</p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {packages.map((pkg, index) => (
        <motion.section
          key={pkg.eventId}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06, ease: [0.16, 0.84, 0.44, 1] }}
          className="cu-panel"
        >
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="cu-eyebrow">
                {packages.length > 1 ? pkg.city : "Your package"}
              </p>
              <h2 className="mt-3 font-display text-[1.85rem] font-bold leading-tight tracking-tight">
                {packages.length > 1 ? pkg.title : "What's included"}
              </h2>
              <p className="mt-2 text-sm font-medium text-ink-soft">
                {packages.length > 1
                  ? `${pkg.tier || "Partnership"} · deliverables locked in`
                  : "Deliverables included in your sponsorship."}
              </p>
            </div>
            {pkg.tier ? (
              <span className="rounded-full bg-cu-yellow-soft px-3 py-1.5 text-[11px] font-extrabold text-ink">
                {pkg.tier}
              </span>
            ) : null}
          </div>

          <ul className="divide-y divide-line">
            {pkg.deliverables.length === 0 ? (
              <li className="py-3 text-sm text-ink-muted">No deliverables listed.</li>
            ) : (
              pkg.deliverables.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[auto_1fr_auto] items-start gap-3 py-3.5 first:pt-0 last:pb-0"
                >
                  <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-full bg-cu-green-soft text-cu-green">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{item.label}</p>
                    {item.option ? (
                      <p className="mt-0.5 text-xs text-ink-muted">{item.option}</p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-cu-blue-soft px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-cu-blue-dark">
                    Included
                  </span>
                </li>
              ))
            )}
          </ul>
        </motion.section>
      ))}
    </div>
  );
}
