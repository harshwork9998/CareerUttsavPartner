"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, FileUp, ImagePlus, X } from "lucide-react";
import { motion } from "framer-motion";

import {
  findSubmittedPortalDocument,
  isStorageBackedPortalDocument,
  portalDocumentMatchToken,
} from "@/lib/partner-portal-document";
import { documentFromCommittedPartner } from "@/lib/portal-dashboard-merge";
import {
  resolvePortalUploadUi,
  resolveSubmittedMediaFrame,
} from "@/lib/portal-upload-presentation";
import {
  fetchPortalDocumentAccessUrl,
  uploadPortalDocumentWithStorage,
} from "@/lib/portal-storage-upload";
import { usePortalDocumentUrl } from "@/lib/use-portal-media-url";
import {
  formatUploadBytes,
  isBrowserPreviewableImage,
  PORTAL_DOCUMENT_FORMAT_LABEL,
  PORTAL_UPLOAD_ACCEPT,
  UPLOAD_INTERRUPTED_MESSAGE,
  validateUploadFile,
} from "@/lib/upload-policy";
import type { EventPackageSummary, Partner, PartnerPortalDocument } from "@/lib/types";

export function HeroSection({
  partner,
  packages,
  onCommitted,
  onLogoRemove,
}: {
  partner: Partner;
  packages: EventPackageSummary[];
  onCommitted: (partner: Partner) => void;
  onLogoRemove: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"idle" | "uploading" | "saving">("idle");
  const [retryHint, setRetryHint] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [confirmedDoc, setConfirmedDoc] = useState<PartnerPortalDocument | undefined>();

  const serverLogoDoc = findSubmittedPortalDocument(partner.portalDocuments, "logo");
  const ui = resolvePortalUploadUi({
    serverDoc: serverLogoDoc,
    confirmedDoc,
    uploading,
    saving: uploading && stage === "saving",
    failed: Boolean(uploadError),
  });
  const logoDoc = ui.displayDoc;
  const { url: signedUrl, isResolving } = usePortalDocumentUrl("logo", logoDoc);
  const frame = resolveSubmittedMediaFrame({
    displayDoc: logoDoc,
    mediaUrl: signedUrl,
    mediaResolving: isResolving,
    localPreview,
    uploading,
  });
  const canPreviewImage = isBrowserPreviewableImage(
    logoDoc?.fileName,
    logoDoc?.mimeType
  );
  const logoUrl = canPreviewImage ? frame.imageUrl : null;

  useEffect(() => {
    if (uploading || isResolving || !signedUrl || !localPreview) return;
    setLocalPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, [uploading, isResolving, signedUrl, localPreview]);

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
    if (!file || uploading) return;
    const error = validateUploadFile({
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type,
    });
    if (error) {
      setUploadError(error);
      return;
    }
    setUploadError(null);
    setSelectedName(`${file.name} · ${formatUploadBytes(file.size)}`);
    setUploading(true);
    setProgress(0);
    setStage("uploading");
    setRetryHint(null);
    const preview = URL.createObjectURL(file);
    setLocalPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return preview;
    });
    const result = await uploadPortalDocumentWithStorage({
      kind: "logo",
      file,
      label: "University logo",
      ifMatchToken: portalDocumentMatchToken(serverLogoDoc ?? confirmedDoc),
      onProgress: (percent) => {
        setProgress(percent);
        if (percent >= 100) setStage("saving");
      },
      onRetry: () => setRetryHint(UPLOAD_INTERRUPTED_MESSAGE),
    });
    if (!result.ok) {
      setUploading(false);
      setUploadError(result.error);
      setLocalPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      if (result.partner) onCommitted(result.partner);
      return;
    }
    setConfirmedDoc(documentFromCommittedPartner(result.partner, "logo"));
    setStage("idle");
    setUploading(false);
    onCommitted(result.partner);
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
          {frame.showFrame ? (
            <>
            <div className="group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[28px] border border-line bg-paper shadow-[0_18px_40px_rgba(20,18,26,0.08)] transition hover:border-cu-red/40">
              <button
                type="button"
                disabled={uploading}
                onClick={() => void onLogoRemove()}
                aria-label="Remove logo"
                className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-ink/80 text-white opacity-0 transition hover:bg-cu-red group-hover:opacity-100 disabled:opacity-50"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                disabled={uploading}
                aria-label="Replace university logo"
                onClick={() => inputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cu-red"
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={PORTAL_UPLOAD_ACCEPT}
                  className="hidden"
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={`${partner.name} logo`}
                    className="h-full w-full object-contain p-8 transition group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-8 text-ink-muted">
                    <FileUp className="h-8 w-8" />
                    <p className="text-xs font-semibold">
                      {uploading
                        ? stage === "saving"
                          ? "Verifying / Saving…"
                          : "Uploading…"
                        : logoDoc?.fileName || "Loading logo…"}
                    </p>
                    {logoDoc?.fileSizeBytes ? (
                      <p className="text-[11px]">{formatUploadBytes(logoDoc.fileSizeBytes)}</p>
                    ) : null}
                    {logoDoc && !uploading ? (
                      <button
                        type="button"
                        onClick={async (event) => {
                          event.stopPropagation();
                          if (logoDoc.url?.trim() && !isStorageBackedPortalDocument(logoDoc)) {
                            window.open(logoDoc.url, "_blank", "noopener,noreferrer");
                            return;
                          }
                          const url = await fetchPortalDocumentAccessUrl("logo");
                          if (url) window.open(url, "_blank", "noopener,noreferrer");
                        }}
                        className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[11px] font-bold text-ink"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View / Download
                      </button>
                    ) : null}
                  </div>
                )}
                <span className="absolute bottom-3 right-3 rounded-full bg-ink/80 px-3 py-1 text-[11px] font-semibold text-white opacity-100 transition group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  Replace
                </span>
              </button>
              {uploading ? (
                <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-ink/80 p-3 text-white">
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span>{stage === "saving" ? "Verifying / Saving…" : "Uploading…"}</span>
                    <span className="tabular-nums">{progress}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-white transition-[width] duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {selectedName ? (
                    <p className="mt-1 truncate text-[11px] text-white/80">{selectedName}</p>
                  ) : null}
                  {retryHint ? (
                    <p className="mt-1 text-[11px] text-white/80">{retryHint}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
            </>
          ) : (
            <div className="cu-panel !p-6 sm:!p-7">
              <h2 className="font-display text-2xl font-bold tracking-tight">
                Add your logo
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-ink-soft">
                A transparent background works best for stall boards and venue
                creatives. {PORTAL_DOCUMENT_FORMAT_LABEL}.
              </p>

              <button
                type="button"
                disabled={uploading}
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
                  accept={PORTAL_UPLOAD_ACCEPT}
                  className="hidden"
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
                {uploading ? (
                  <div className="w-full max-w-[240px] px-4">
                    <p className="text-sm font-bold text-ink">
                      {stage === "saving" ? "Verifying…" : "Uploading…"} {progress}%
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
                      <div
                        className="h-full rounded-full bg-cu-red transition-[width] duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {selectedName ? (
                      <p className="mt-2 text-xs text-ink-muted">{selectedName}</p>
                    ) : null}
                    {retryHint ? (
                      <p className="mt-1 text-xs text-ink-muted">{retryHint}</p>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <span className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-cu-red-soft text-cu-red">
                      <ImagePlus className="h-7 w-7" />
                    </span>
                    <p className="font-display text-lg font-bold text-ink">
                      Add your logo
                    </p>
                    <p className="mt-1 max-w-[20ch] text-center text-xs leading-relaxed text-ink-muted">
                      Drop a file here or click to upload
                    </p>
                  </>
                )}
              </button>
              {uploadError ? (
                <p className="mt-2 text-xs font-semibold text-cu-red">
                  {uploadError}
                </p>
              ) : null}
            </div>
          )}
          {frame.showFrame && uploadError ? (
            <p className="mt-2 text-xs font-semibold text-cu-red">{uploadError}</p>
          ) : null}
        </motion.div>
      </div>
    </motion.section>
  );
}
