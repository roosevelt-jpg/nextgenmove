"use client";

import { useMemo, useState } from "react";
import { normalizeToE164 } from "@/lib/phone/e164";
import { cn } from "@/lib/utils";

const DIAL_OPTIONS = [
  { dial: "+971", label: "AE +971" },
  { dial: "+31", label: "NL +31" },
  { dial: "+1", label: "US/CA +1" },
  { dial: "+44", label: "UK +44" },
  { dial: "+91", label: "IN +91" },
  { dial: "+234", label: "NG +234" },
  { dial: "+254", label: "KE +254" },
  { dial: "+27", label: "ZA +27" },
  { dial: "+49", label: "DE +49" },
  { dial: "+33", label: "FR +33" },
  { dial: "+966", label: "SA +966" },
  { dial: "+974", label: "QA +974" },
] as const;

export interface PhoneE164FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (e164OrRaw: string) => void;
  required?: boolean;
  hint?: string;
  className?: string;
}

/**
 * Country dial code + national number → E.164 string.
 * If the user pastes a full +number, it is kept as-is after normalize.
 */
export function PhoneE164Field({
  id,
  label,
  value,
  onChange,
  required,
  hint,
  className,
}: PhoneE164FieldProps) {
  const initial = useMemo(() => splitPhone(value), []);
  const [dial, setDial] = useState(initial.dial);
  const [national, setNational] = useState(initial.national);

  const emit = (nextDial: string, nextNational: string) => {
    const trimmedNational = nextNational.trim();
    if (!trimmedNational) {
      onChange("");
      return;
    }
    if (trimmedNational.startsWith("+")) {
      onChange(normalizeToE164(trimmedNational) ?? trimmedNational);
      return;
    }
    const combined = `${nextDial}${trimmedNational.replace(/^0+/, "").replace(/\D/g, "")}`;
    onChange(normalizeToE164(combined) ?? combined);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className="block font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-text-label"
      >
        {label}
        {required ? " *" : ""}
      </label>
      <div className="flex gap-2">
        <select
          aria-label="Country code"
          value={dial}
          onChange={(event) => {
            const next = event.target.value;
            setDial(next);
            emit(next, national);
          }}
          className="w-[7.5rem] shrink-0 rounded-radius-sm border border-border bg-surface-1 px-2 py-2 text-sm text-text-primary"
        >
          {DIAL_OPTIONS.map((option) => (
            <option key={option.dial} value={option.dial}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          required={required}
          autoComplete="tel-national"
          placeholder="5X XXX XXXX"
          value={national}
          onChange={(event) => {
            const next = event.target.value;
            setNational(next);
            emit(dial, next);
          }}
          className="min-w-0 flex-1 rounded-radius-sm border border-border bg-surface-1 px-3 py-2 text-sm text-text-primary"
        />
      </div>
      {hint ? <p className="text-[11px] text-text-muted">{hint}</p> : null}
    </div>
  );
}

function splitPhone(raw: string): { dial: string; national: string } {
  const normalized = normalizeToE164(raw);
  if (!normalized) {
    return { dial: "+971", national: raw.replace(/^\+/, "") };
  }
  const match = DIAL_OPTIONS.find((option) =>
    normalized.startsWith(option.dial),
  );
  if (match) {
    return {
      dial: match.dial,
      national: normalized.slice(match.dial.length),
    };
  }
  return { dial: "+971", national: normalized.slice(1) };
}
