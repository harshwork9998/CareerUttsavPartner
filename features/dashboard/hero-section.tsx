"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { motion } from "framer-motion";

import type { EventPackageSummary, Partner } from "@/lib/types";

export function HeroSection({
  partner,
  packages,
  logoUrl,
  onLogoUpload,
  onLogoRemove,
  saving,
}: {
  partner: Partner;
  packages: EventPackageSummary[];
  logoUrl?: string;
  onLogoUpload: (file: File) => Promise<void>;
  onLogoRemove: () => Promise<void>;
  saving: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const firstName = partner.name.split(" ")[0] || partner.name;
  const eventPartnerships =
    packages.length > 0
      ? packages.map((pkg) => ({
          key: pkg.eventId,
          city: pkg.city,
          tier: pkg.tier || partner.sponsorshipTier || "Partnership",
          title: pkg.title,
        }))
      : [
          {
            key: "fallback",
            city: partner.city,
            tier: partner.sponsorshipTier || "Partnership",
            title: "Career Uttsav",
          },
        ];

  const handleFile = async (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    await onLogoUpload(file);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 0.84, 0.44, 1] }}
      className="relative"
    >
      <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
        <div>
          <h1 className="max-w-[14ch] font-display text-[clamp(2.4rem,5vw,4.25rem)] font-bold leading-[0.98] tracking-[-0.02em]">
            You&apos;re in, <em className="not-italic text-cu-red">{firstName}.</em>
          </h1>
          <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-ink-soft">
            {eventPartnerships.length === 1
              ? `Your ${eventPartnerships[0].tier} package for ${eventPartnerships[0].title} is ready.`
              : `Your partnership spans ${eventPartnerships.length} Career Uttsav events — each with its own sponsorship package.`}{" "}
            Finish the checklist below so we can go live on venue creatives.
          </p>

          <ul className="mt-7 flex flex-col gap-2 sm:max-w-lg">
            {eventPartnerships.map((row) => (
              <li
                key={row.key}
                className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white/80 px-3.5 py-2.5"
              >
                <span className="rounded-full bg-cu-blue-soft px-2.5 py-1 text-[11px] font-extrabold text-cu-blue-dark">
                  {row.city}
                </span>
                <span className="text-xs font-semibold text-ink-muted">→</span>
                <span className="text-sm font-bold text-ink">{row.tier}</span>
              </li>
            ))}
          </ul>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 0.84, 0.44, 1] }}
          className="w-full max-w-[420px] justify-self-center lg:justify-self-end"
        >
          {logoUrl ? (
            <div className="group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[28px] border border-line bg-paper shadow-[0_18px_40px_rgba(20,18,26,0.08)] transition hover:border-cu-red/40">
              <button
                type="button"
                disabled={saving}
                onClick={() => void onLogoRemove()}
                aria-label="Remove logo"
                className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-ink/80 text-white opacity-0 transition hover:bg-cu-red group-hover:opacity-100 disabled:opacity-50"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => inputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center"
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={`${partner.name} logo`}
                  className="h-full w-full object-contain p-8 transition group-hover:scale-[1.02]"
                />
                <span className="absolute bottom-3 right-3 rounded-full bg-ink/80 px-3 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                  Edit
                </span>
              </button>
            </div>
          ) : (
            <div className="cu-panel !p-6 sm:!p-7">
              <h2 className="font-display text-2xl font-bold tracking-tight">
                Add your logo
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">
                PNG or SVG with a transparent background works best for stall
                boards and venue creatives.
              </p>

              <button
                type="button"
                disabled={saving}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOver(false);
                  await handleFile(e.dataTransfer.files[0]);
                }}
                className={`group relative mt-5 flex min-h-[220px] w-full flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed transition ${
                  dragOver
                    ? "border-cu-red bg-cu-red-soft/40 scale-[1.01]"
                    : "border-line-strong bg-paper hover:border-cu-red hover:bg-cu-red-soft/20"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
                <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-cu-red-soft text-cu-red">
                  <ImagePlus className="h-7 w-7" />
                </span>
                <p className="font-display text-lg font-bold text-ink">
                  Add your logo
                </p>
                <p className="mt-1 max-w-[20ch] text-center text-xs leading-relaxed text-ink-muted">
                  Drop a file here or click to upload
                </p>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </motion.section>
  );
}
