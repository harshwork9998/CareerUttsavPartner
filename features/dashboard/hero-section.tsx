"use client";

import { useRef, useState } from "react";
import { ImagePlus, Sparkles } from "lucide-react";
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
  uploadStatus: { completed: number; total: number; progress: number };
  logoUrl?: string;
  onLogoUpload: (file: File) => Promise<void>;
  saving: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const cities = [...new Set(packages.map((p) => p.city))].join(" · ");
  const tiers = [...new Set(packages.map((p) => p.tier).filter(Boolean))];
  const tierLabel = tiers.length ? tiers.join(" · ") : partner.sponsorshipTier;

  const handleFile = async (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    await onLogoUpload(file);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-4xl border border-line-subtle bg-white shadow-soft"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-40"
        style={{ background: "radial-gradient(circle, #F3F6FA 0%, transparent 70%)" }}
      />

      <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
        <div className="p-6 sm:p-8 lg:p-9">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">
            Welcome back
          </p>
          <h1 className="mt-2 max-w-[16ch] font-display text-3xl font-bold leading-[1.08] text-brand-950 sm:text-4xl">
            You&apos;re in, {partner.name.split(" ")[0]}.
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-secondary">
            {packages.length === 1
              ? `Your ${tierLabel || "partnership"} package for ${packages[0]?.title} is confirmed.`
              : `Your partnership across ${packages.length} events is confirmed.`}{" "}
            Share your brand assets so we can go live on venue creatives.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {tierLabel ? (
              <span className="inline-flex items-center rounded-full border border-brass-500/40 bg-brass-100 px-3 py-1 text-xs font-bold text-brass-700">
                {tierLabel}
              </span>
            ) : null}
            {cities ? (
              <span className="inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                {cities}
              </span>
            ) : null}
            <span className="inline-flex items-center rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">
              Partnership confirmed
            </span>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="relative h-2 flex-1 max-w-xs overflow-hidden rounded-full bg-paper-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-700 to-teal-600 transition-all duration-500"
                style={{ width: `${Math.round(uploadStatus.progress * 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums text-ink-secondary">
              {uploadStatus.completed}/{uploadStatus.total} items shared
            </span>
          </div>
        </div>

        {/* Logo stage — hero right side */}
        <div className="flex items-stretch border-t border-line-subtle bg-gradient-to-br from-brand-50/80 via-paper-muted to-brass-100/30 p-5 lg:border-l lg:border-t-0 lg:p-6">
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
            className={`group relative flex min-h-[220px] w-full flex-col items-center justify-center overflow-hidden rounded-[22px] border-2 border-dashed transition-all duration-300 ${
              dragOver
                ? "border-brand-500 bg-white scale-[1.01]"
                : logoUrl
                  ? "border-success/35 bg-white"
                  : "border-line-strong bg-white/70 hover:border-brand-500 hover:bg-white"
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
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt={`${partner.name} logo`}
                  className="max-h-[140px] max-w-[85%] object-contain p-4 transition group-hover:scale-[1.02]"
                />
                <span className="absolute bottom-3 rounded-full bg-brand-950/75 px-3 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                  Replace logo
                </span>
              </>
            ) : (
              <>
                <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-4 ring-white shadow-card">
                  <ImagePlus className="h-7 w-7" />
                </span>
                <p className="font-display text-lg font-bold text-brand-800">
                  Add your logo
                </p>
                <p className="mt-1 max-w-[18ch] text-center text-xs leading-relaxed text-ink-muted">
                  PNG or SVG · transparent preferred · shows on your stall board
                </p>
                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-brass-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brass-700">
                  <Sparkles className="h-3 w-3" />
                  Featured in hero
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.section>
  );
}
