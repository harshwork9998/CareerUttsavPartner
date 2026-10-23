const BOOK_AD_LABELS: Record<string, string> = {
  "full page": 'Full Page (6.5" W × 4.75" H)',
  "half page": 'Half Page (6.5" W × 9.5" H)',
};

export function deliverableOptionLabel(option: string | undefined): string {
  if (!option) return "";
  return BOOK_AD_LABELS[option.trim().toLowerCase()] ?? option;
}

export function partnerFacingCopy(text: string): string {
  return text
    .replaceAll("Seminars", "Panel Discussions")
    .replaceAll("seminars", "panel discussions")
    .replaceAll("Seminar", "Panel Discussion")
    .replaceAll("seminar", "panel discussion");
}
