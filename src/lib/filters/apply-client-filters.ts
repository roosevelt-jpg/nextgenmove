export type FilterValue = string | number | boolean | null | undefined;

export type FilterAccessor<T> = (row: T) => unknown;

export interface ClientFilterConfig<T> {
  /** Free-text search across these accessors (OR within fields, AND with other filters). */
  search?: {
    value: string | null | undefined;
    accessors: Array<FilterAccessor<T>>;
  };
  /** Exact string match when value is non-empty. */
  equals?: Array<{
    value: string | null | undefined;
    accessor: FilterAccessor<T>;
  }>;
  /** Numeric inclusive range. */
  numberRanges?: Array<{
    min?: number | null;
    max?: number | null;
    accessor: FilterAccessor<T>;
  }>;
  /** Boolean exact match when value is true/false (skip when null/undefined). */
  booleans?: Array<{
    value: boolean | null | undefined;
    accessor: FilterAccessor<T>;
  }>;
}

function asString(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.filter(Boolean).join(" ");
  return String(value);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function applyClientFilters<T>(
  rows: T[],
  config: ClientFilterConfig<T>,
): T[] {
  const query = config.search?.value?.trim().toLowerCase() ?? "";

  return rows.filter((row) => {
    if (query && config.search) {
      const haystack = config.search.accessors
        .map((accessor) => asString(accessor(row)))
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (config.equals) {
      for (const rule of config.equals) {
        const expected = rule.value?.trim();
        if (!expected) continue;
        if (asString(rule.accessor(row)) !== expected) return false;
      }
    }

    if (config.numberRanges) {
      for (const rule of config.numberRanges) {
        const hasMin = rule.min != null && !Number.isNaN(rule.min);
        const hasMax = rule.max != null && !Number.isNaN(rule.max);
        if (!hasMin && !hasMax) continue;
        const n = asNumber(rule.accessor(row));
        if (n == null) return false;
        if (hasMin && n < (rule.min as number)) return false;
        if (hasMax && n > (rule.max as number)) return false;
      }
    }

    if (config.booleans) {
      for (const rule of config.booleans) {
        if (rule.value == null) continue;
        const actual = Boolean(rule.accessor(row));
        if (actual !== rule.value) return false;
      }
    }

    return true;
  });
}

/** Build URLSearchParams from a flat filter values map (skips empty). */
export function toSearchParams(
  values: Record<string, FilterValue>,
  keys?: string[],
): URLSearchParams {
  const params = new URLSearchParams();
  const entries = keys
    ? keys.map((key) => [key, values[key]] as const)
    : Object.entries(values);

  for (const [key, value] of entries) {
    if (value == null) continue;
    const text = String(value).trim();
    if (!text) continue;
    params.set(key, text);
  }

  return params;
}

export function uniqueOptionValues(
  values: Array<string | null | undefined>,
): { value: string; label: string }[] {
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [];
  for (const raw of values) {
    const value = String(raw ?? "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: value });
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
}
