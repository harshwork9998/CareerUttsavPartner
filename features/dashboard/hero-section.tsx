"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { motion } from "framer-motion";

import type { EventPackageSummary, Partner } from "@/lib/types";

export function HeroSection({
  partner,
  packages,
  uploadStatus,
  logoUrl,
  onLogoUpload,
  saving,
}: {
  partner: Partner;
  packages: EventPackageSummary[];
  uploadStatus: {
    completed: number;
    total: number;
    progress: number;
    missing: Array<{ key: string; label: string }>;
  };
  logoUrl?: string;
  onLogoUpload: (file: File) => Promise<void>;
  saving: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const cities = [...new Set(packages.map((p) => p.city))];
  const tiers = [...new Set(packages.map((p) => p.tier).filter(Boolean))];
  const tierLabel = tiers.length ? tiers.join(" · ") : partner.sponsorshipTier;
  const nextAction = uploadStatus.missing[0]?.label ?? "All set";
  const firstName = partner.name.split(" ")[0] || partner.name;

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
          <p className="cu-eyebrow">Welcome back</p>
          <h1 className="mt-5 max-w-[14ch] font-display text-[clamp(2.4rem,5vw,4.25rem)] font-bold leading-[0.98] tracking-[-0.02em]">
            You&apos;re in, <em className="not-italic text-cu-red">{firstName}.</em>
          </h1>
          <p className="mt-5 max-w-xl text-lg font-medium leading-relaxed text-ink-soft">
            {packages.length === 1
              ? `Your ${tierLabel || "partnership"} for ${packages[0]?.title} is confirmed.`
              : `Your partnership across ${packages.length} Career Uttsav events is confirmed.`}{" "}
            Finish the checklist below so we can go live on venue creatives.
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            {tierLabel ? (
              <span className="rounded-full bg-cu-yellow-soft px-3.5 py-1.5 text-xs font-extrabold text-ink">
                {tierLabel}
              </span>
            ) : null}
            {cities.map((city) => (
              <span
                key={city}
                className="rounded-full bg-cu-blue-soft px-3.5 py-1.5 text-xs font-extrabold text-cu-blue-dark"
              >
                {city}
              </span>
            ))}
            <span className="rounded-full bg-cu-green-soft px-3.5 py-1.5 text-xs font-extrabold text-cu-green">
              Confirmed
            </span>
          </div>

          <div className="mt-8 max-w-md">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-ink-soft">
                Next up: <span className="text-ink">{nextAction}</span>
              </span>
              <span className="tabular-nums font-bold text-ink">
                {uploadStatus.completed}/{uploadStatus.total}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cu-red to-cu-yellow"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.round(uploadStatus.progress * 100)}%`,
                }}
                transition={{ duration: 0.7, ease: [0.16, 0.84, 0.44, 1] }}
              />
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, rotate: 5, y: 12 }}
          animate={{ opacity: 1, rotate: 3, y: 0 }}
          whileHover={{ rotate: 0, y: -6 }}
          transition={{ duration: 0.5, ease: [0.16, 0.84, 0.44, 1] }}
          className="relative w-full max-w-[460px] justify-self-center lg:justify-self-end"
        >
          <div className="overflow-hidden rounded-[26px] bg-ink p-7 text-white shadow-soft sm:p-8">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="rounded-md bg-white px-2.5 py-1.5 font-display text-xs font-bold text-ink">
                Career Uttsav
              </div>
              <span className="rounded-full bg-cu-red px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em]">
                Partner
              </span>
            </div>

            <h2 className="font-display text-[1.7rem] font-bold leading-tight sm:text-[1.9rem]">
              {partner.name}
            </h2>
            <p className="mt-1 text-sm text-white/55">
              {partner.city}
              {partner.state ? `, ${partner.state}` : ""}
            </p>

            <div className="relative my-6 border-t-2 border-dashed border-white/20">
              <span className="absolute -left-10 -top-[11px] h-[22px] w-[22px] rounded-full bg-paper" />
              <span className="absolute -right-10 -top-[11px] h-[22px] w-[22px] rounded-full bg-paper" />
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/45">
                  Events
                </p>
                <p className="mt-1 font-display text-lg">{packages.length}</p>
              </div>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/45">
                  Progress
                </p>
                <p className="mt-1 font-display text-lg">
                  {Math.round(uploadStatus.progress * 100)}%
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-white/45">
                  Brand logo
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
                  className={`mt-2 flex min-h-[108px] w-full flex-col items-center justify-center rounded-2xl border border-dashed transition ${
                    dragOver
                      ? "border-cu-yellow bg-white/10"
                      : logoUrl
                        ? "border-white/20 bg-white/5"
                        : "border-white/25 bg-white/[0.03] hover:border-cu-yellow hover:bg-white/5"
                  }`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => void handleFile(e.target.files?.[0])}
                  />
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt={`${partner.name} logo`}
                      className="max-h-16 max-w-[70%] object-contain"
                    />
                  ) : (
                    <>
                      <ImagePlus className="mb-2 h-5 w-5 text-cu-yellow" />
                      <span className="text-xs font-semibold text-white/70">
                        Drop logo or click to upload
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div
              className="mt-6 h-8 opacity-70"
              style={{
                background:
                  "repeating-linear-gradient(90deg, #fff 0 2px, transparent 2px 5px, #fff 5px 6px, transparent 6px 10px)",
              }}
            />
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
