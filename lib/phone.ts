/** Indian mobile number helpers — digits only, 10 digits, starts with 6–9. */

export const INDIAN_MOBILE_ERROR = "Enter a valid 10-digit mobile number";

/**
 * Strip formatting and leading country code, keep digits only.
 * Examples: "+91 98765-43210" → "9876543210", "09876543210" → "9876543210"
 */
export function normalizeIndianMobile(raw: string): string {
  let digits = String(raw ?? "").replace(/\D/g, "");

  // Drop leading 0 (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Drop +91 / 91 country code when pasted
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  if (digits.length > 10 && digits.startsWith("91")) {
    digits = digits.slice(-10);
  }

  // While typing, keep at most 10 digits
  return digits.slice(0, 10);
}

export function isValidIndianMobile(raw: string): boolean {
  const digits = normalizeIndianMobile(raw);
  return /^[6-9]\d{9}$/.test(digits);
}

/** Allow only digit keystrokes while typing; paste is normalized separately. */
export function filterPhoneInput(raw: string): string {
  return normalizeIndianMobile(raw);
}
