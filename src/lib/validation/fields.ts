import { z } from "zod";

/** Empty string / null / invalid → null; otherwise require a URL. */
export const optionalNullableUrl = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "string" && !value.trim()) return null;
  return value;
}, z.string().url().nullable().optional());

/** Coerce numbers; blank/null/NaN → 0 so number inputs never fail PATCH. */
export const finiteNumber = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number" && !Number.isFinite(value)) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}, z.number().finite());

export const optionalString = z.preprocess(
  (value) => (value == null ? "" : String(value)),
  z.string(),
);
