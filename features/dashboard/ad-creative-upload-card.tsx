"use client";

import { useCallback, useRef, useState } from "react";
import { Check, ExternalLink, FileUp, Upload } from "lucide-react";

import {
  fetchPortalDocumentAccessUrl,
  uploadAdCreativeWithStorage,
} from "@/lib/ad-creative-upload";
import { isStorageBackedPortalDocument } from "@/lib/partner-portal-document";
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
  onCommitted: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [retryHint, setRetryHint] = useState<string | null>(null);

  const done = Boolean(doc);

  const pickFile = useCallback((file: File | undefined) => {
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
  }, [uploading]);

  const startUpload = useCallback(async () => {
    if (!selectedFile || uploading) return;
    setUploading(true);
    setProgress(0);
    setStatus("idle");
    setMessage(null);
    setRetryHint(null);

    const result = await uploadAdCreativeWithStorage({
      file: selectedFile,
      label,
      onProgress: setProgress,
      onRetry: () => setRetryHint(UPLOAD_INTERRUPTED_MESSAGE),
    });

    setUploading(false);
    if (!result.ok) {
      setStatus("error");
      setMessage(result.error);
      return;
    }

    setStatus("success");
    setMessage("Advertisement creative saved.");
    setSelectedFile(null);
    onCommitted();
  }, [label, onCommitted, selectedFile, uploading]);

  const openSubmitted = useCallback(async () => {
    if (!doc) return;
    if (doc.url?.trim() && !isStorageBackedPortalDocument(doc)) {
      window.open(doc.url, "_blank", "noopener,noreferrer");
      return;
    }
    const url = await fetchPortalDocumentAccessUrl("ad_creative");
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }, [doc]);

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
        pickFile(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={PORTAL_UPLOAD_ACCEPT}
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          pickFile(e.target.files?.[0]);
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
              : done && doc
                ? `Uploaded · ${doc.fileName}`
                : "Click or drag a file here (SVG, PNG, JPG, PDF, CDR, AI, EPS)"}
          </p>
        </div>
        {done && status !== "success" ? (
          <Check className="h-4 w-4 shrink-0 text-cu-green" strokeWidth={3} />
        ) : null}
      </div>

      {uploading ? (
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-[11px] font-semibold text-ink-soft">
            <span>Uploading…</span>
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
          onClick={() => void startUpload()}
          className="mt-3 h-9 rounded-full bg-cu-red px-4 text-xs font-bold text-white"
        >
          Upload
        </button>
      ) : null}

      {done && doc ? (
        <button
          type="button"
          onClick={() => void openSubmitted()}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-cu-blue"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View current creative
        </button>
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
