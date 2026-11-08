"use client";

import { useCallback, useRef, useState } from "react";
import { Check, ExternalLink, FileUp, Upload } from "lucide-react";

import {
  fetchPortalDocumentAccessUrl,
  uploadAdCreativeWithStorage,
} from "@/lib/ad-creative-upload";
import {
  isStorageBackedPortalDocument,
  portalDocumentMatchToken,
} from "@/lib/partner-portal-document";
import { documentFromCommittedPartner } from "@/lib/portal-dashboard-merge";
import { resolvePortalUploadUi } from "@/lib/portal-upload-presentation";
import {
  AD_CREATIVE_UNSUPPORTED_MESSAGE,
  formatUploadBytes,
  PORTAL_UPLOAD_ACCEPT,
  UPLOAD_INTERRUPTED_MESSAGE,
  validateUploadFile,
} from "@/lib/upload-policy";
import type { Partner, PartnerPortalDocument } from "@/lib/types";

export function AdCreativeUploadCard({
  label,
  doc,
  onCommitted,
}: {
  label: string;
  doc?: PartnerPortalDocument;
  onCommitted: (partner: Partner) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceMode = useRef(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [retryHint, setRetryHint] = useState<string | null>(null);
  const [confirmedDoc, setConfirmedDoc] = useState<PartnerPortalDocument | undefined>();

  const ui = resolvePortalUploadUi({
    serverDoc: doc,
    confirmedDoc,
    selectedFile: Boolean(selectedFile),
    uploading,
    saving: uploading && status === "saving",
    failed: status === "error",
  });
  const displayDoc = ui.displayDoc;
  const done = Boolean(displayDoc);

  const runUpload = useCallback(async (file: File) => {
    if (uploading) return;
    setUploading(true);
    setProgress(0);
    setStatus("uploading");
    setMessage(null);
    setRetryHint(null);

    const result = await uploadAdCreativeWithStorage({
      file,
      label,
      ifMatchToken: portalDocumentMatchToken(displayDoc),
      onProgress: (percent) => {
        setProgress(percent);
        if (percent >= 100) setStatus("saving");
      },
      onRetry: () => setRetryHint(UPLOAD_INTERRUPTED_MESSAGE),
    });

    if (!result.ok) {
      setUploading(false);
      setStatus("error");
      setMessage(result.error);
      if (result.partner) onCommitted(result.partner);
      return;
    }

    setConfirmedDoc(documentFromCommittedPartner(result.partner, "ad_creative"));
    setStatus("success");
    setMessage("Submitted.");
    setSelectedFile(null);
    setUploading(false);
    onCommitted(result.partner);
  }, [displayDoc, label, onCommitted, uploading]);

  const pickFile = useCallback((file: File | undefined, autoStart = false) => {
    if (!file || uploading) return;
    const error = validateUploadFile({
      fileName: file.name,
      fileSizeBytes: file.size,
      kind: "ad_creative",
      mimeType: file.type,
    });
    if (error) {
      setSelectedFile(null);
      setStatus("error");
      setMessage(error);
      return;
    }
    setSelectedFile(file);
    setStatus("idle");
    setMessage(null);
    setProgress(0);
    setRetryHint(null);
    if (autoStart) void runUpload(file);
  }, [runUpload, uploading]);

  const openSubmitted = useCallback(async () => {
    if (!displayDoc) return;
    if (displayDoc.url?.trim() && !isStorageBackedPortalDocument(displayDoc)) {
      window.open(displayDoc.url, "_blank", "noopener,noreferrer");
      return;
    }
    const url = await fetchPortalDocumentAccessUrl("ad_creative");
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }, [displayDoc]);

  return (
    <div
      className={`rounded-2xl border-2 border-dashed px-4 py-4 transition ${
        done
          ? "border-cu-green/35 bg-cu-green-soft/30"
          : dragActive
            ? "border-cu-red/50 bg-cu-red-soft/20"
            : "border-line-strong bg-paper"
      }`}
      onDragEnter={(e) => {
        e.preventDefault();
        if (!uploading) setDragActive(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!uploading) setDragActive(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragActive(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        if (uploading) return;
        pickFile(e.dataTransfer.files?.[0], done);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={PORTAL_UPLOAD_ACCEPT}
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          pickFile(e.target.files?.[0], replaceMode.current || done);
          replaceMode.current = false;
          e.target.value = "";
        }}
      />

      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-cu-red shadow-sm disabled:opacity-50"
        >
          {done ? <FileUp className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {selectedFile
              ? `${selectedFile.name} · ${formatUploadBytes(selectedFile.size)}`
              : ui.phase === "finalizing" && displayDoc
                ? `Saving · ${displayDoc.fileName}`
                : done && displayDoc
                ? `Submitted · ${displayDoc.fileName}${displayDoc.fileSizeBytes ? ` · ${formatUploadBytes(displayDoc.fileSizeBytes)}` : ""}`
                : "Click or drag a file here (SVG, PNG, JPG, PDF, CDR, AI or EPS)"}
          </p>
        </div>
        {done ? (
          <Check className="h-4 w-4 shrink-0 text-cu-green" strokeWidth={3} />
        ) : null}
      </div>

      {uploading ? (
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-[11px] font-semibold text-ink-soft">
            <span>
              {status === "saving"
                ? "Verifying / Saving…"
                : done
                  ? "Replacing…"
                  : "Uploading…"}
            </span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-cu-red transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {retryHint ? (
            <p className="text-[11px] font-medium text-ink-muted">{retryHint}</p>
          ) : null}
        </div>
      ) : null}

      {selectedFile && !uploading ? (
        <button
          type="button"
          onClick={() => selectedFile && void runUpload(selectedFile)}
          className="mt-3 h-9 rounded-full bg-cu-red px-4 text-xs font-bold text-white"
        >
          {status === "error" ? "Retry" : "Upload"}
        </button>
      ) : null}

      {done && displayDoc ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void openSubmitted()}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-bold text-ink"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View / Download
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => {
              replaceMode.current = true;
              inputRef.current?.click();
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-cu-red px-3 text-xs font-bold text-white disabled:opacity-50"
          >
            Replace Document
          </button>
        </div>
      ) : null}

      {status === "success" && message ? (
        <p className="mt-2 text-xs font-semibold text-cu-green">{message}</p>
      ) : null}
      {status === "error" && message ? (
        <p className="mt-2 text-xs font-semibold text-cu-red">{message}</p>
      ) : null}
      {!message && !selectedFile && !done ? (
        <p className="mt-2 text-[11px] text-ink-muted">{AD_CREATIVE_UNSUPPORTED_MESSAGE}</p>
      ) : null}
    </div>
  );
}
