"use client";

import { useState } from "react";

import {
  filterPhoneInput,
  INDIAN_MOBILE_ERROR,
  isValidIndianMobile,
  normalizeIndianMobile,
} from "@/lib/phone";

export function PhoneField({
  value,
  onChange,
  disabled,
  placeholder = "Phone number",
  className = "cu-input !h-10",
  showError,
}: {
  value: string;
  onChange: (normalized: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** When true, show error if current value is invalid (e.g. after save attempt). */
  showError?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  const normalized = normalizeIndianMobile(value);
  const invalid =
    (touched || showError) &&
    (normalized.length > 0 || showError) &&
    !isValidIndianMobile(normalized);

  return (
    <div>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        maxLength={10}
        placeholder={placeholder}
        disabled={disabled}
        value={normalized}
        onChange={(e) => onChange(filterPhoneInput(e.target.value))}
        onBlur={() => {
          setTouched(true);
          onChange(normalizeIndianMobile(value));
        }}
        className={`${className}${invalid ? " !border-cu-red focus:!border-cu-red focus:!ring-cu-red/20" : ""}`}
        aria-invalid={invalid}
      />
      {invalid ? (
        <p className="mt-1 text-[11px] font-semibold text-cu-red">
          {INDIAN_MOBILE_ERROR}
        </p>
      ) : null}
    </div>
  );
}
