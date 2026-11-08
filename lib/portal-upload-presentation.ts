import { pickFresherPortalDocument } from "@/lib/portal-dashboard-merge";
import type { PartnerPortalDocument } from "@/lib/types";

export type PortalUploadUiPhase =
  | "empty"
  | "selected"
  | "uploading"
  | "saving"
  | "finalizing"
  | "submitted"
  | "failed";

export function resolvePortalUploadUi(input: {
  serverDoc?: PartnerPortalDocument;
  confirmedDoc?: PartnerPortalDocument;
  selectedFile?: boolean;
  uploading?: boolean;
  saving?: boolean;
  failed?: boolean;
  mediaUrl?: string | null;
  mediaResolving?: boolean;
}): {
  phase: PortalUploadUiPhase;
  displayDoc?: PartnerPortalDocument;
  showEmptyDropzone: boolean;
} {
  const displayDoc = pickFresherPortalDocument(
    input.confirmedDoc,
    input.serverDoc
  );

  if (input.uploading) {
    return {
      phase: input.saving ? "saving" : "uploading",
      displayDoc,
      showEmptyDropzone: false,
    };
  }

  if (input.failed) {
    return {
      phase: "failed",
      displayDoc,
      showEmptyDropzone: !displayDoc && !input.selectedFile,
    };
  }

  if (displayDoc) {
    if (input.mediaResolving && !input.mediaUrl) {
      return { phase: "finalizing", displayDoc, showEmptyDropzone: false };
    }
    return { phase: "submitted", displayDoc, showEmptyDropzone: false };
  }

  if (input.selectedFile) {
    return { phase: "selected", showEmptyDropzone: false };
  }

  return { phase: "empty", showEmptyDropzone: true };
}

export function resolveSubmittedMediaFrame(input: {
  displayDoc?: PartnerPortalDocument | null;
  mediaUrl?: string | null;
  mediaResolving?: boolean;
  localPreview?: string | null;
  uploading?: boolean;
}): {
  showFrame: boolean;
  imageUrl: string | null;
  showPlaceholder: boolean;
} {
  const imageUrl = input.mediaUrl || input.localPreview || null;
  const showFrame = Boolean(
    input.displayDoc ||
      imageUrl ||
      input.uploading ||
      input.mediaResolving
  );
  return {
    showFrame,
    imageUrl,
    showPlaceholder: showFrame && !imageUrl,
  };
}

export function resolvePortalMediaUrlState(input: {
  docPresent: boolean;
  storageBacked: boolean;
  legacyUrl: string | null;
  previousUrl: string | null;
  localPreview?: string | null;
}): { url: string | null; isResolving: boolean } {
  if (input.localPreview) {
    return { url: input.localPreview, isResolving: false };
  }
  if (!input.docPresent) {
    return { url: null, isResolving: false };
  }
  if (!input.storageBacked) {
    return { url: input.legacyUrl, isResolving: false };
  }
  return {
    url: input.previousUrl || input.legacyUrl,
    isResolving: true,
  };
}
