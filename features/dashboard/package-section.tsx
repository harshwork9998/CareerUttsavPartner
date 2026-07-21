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
      <Panel title="Partner package" subtitle="Your sponsorship deliverables by event.">
        <p className="text-sm text-ink-muted">No event packages linked yet.</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      {packages.map((pkg, index) => (
        <motion.div
          key={pkg.eventId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Panel
            title={packages.length > 1 ? pkg.title : "Partner package"}
            subtitle={
              packages.length > 1
                ? `${pkg.city} · ${pkg.tier || "Partnership"}`
                : "Deliverables included in your sponsorship."
            }
            badge={packages.length > 1 ? pkg.tier : undefined}
          >
            <ul className="divide-y divide-line-subtle">
              {pkg.deliverables.length === 0 ? (
                <li className="py-2 text-sm text-ink-muted">No deliverables listed.</li>
              ) : (
                pkg.deliverables.map((item) => (
                  <li
                    key={item.id}
                    className="grid grid-cols-[auto_1fr_auto] gap-3 py-3 first:pt-0"
                  >
                    <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-success-soft text-success">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{item.label}</p>
                      {item.option ? (
                        <p className="mt-0.5 text-xs text-ink-muted">{item.option}</p>
                      ) : null}
                    </div>
                    <span className="self-start rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700">
                      Included
                    </span>
                  </li>
                ))
              )}
            </ul>
          </Panel>
        </motion.div>
      ))}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-line-subtle bg-white p-5 shadow-card sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-brand-800">{title}</h2>
          <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p>
        </div>
        {badge ? (
          <span className="shrink-0 rounded-full bg-brass-100 px-2.5 py-1 text-[10px] font-bold text-brass-700">
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}
