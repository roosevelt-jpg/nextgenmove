"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type AdvancedFilterValue = string;

export type AdvancedFilterField =
  | {
      id: string;
      type: "search";
      labelKey: string;
      placeholderKey?: string;
      debounceMs?: number;
    }
  | {
      id: string;
      type: "select";
      labelKey: string;
      allKey?: string;
      options: { value: string; label: string }[];
    }
  | {
      id: string;
      type: "numberRange";
      labelKey: string;
      minKey?: string;
      maxKey?: string;
      minId?: string;
      maxId?: string;
    };

export interface AdvancedFiltersProps {
  labels: Record<string, string>;
  fields: AdvancedFilterField[];
  values: Record<string, AdvancedFilterValue>;
  onChange: (next: Record<string, AdvancedFilterValue>) => void;
  onClear?: () => void;
  clearKey?: string;
  className?: string;
  /** Hide a field when its labelKey is missing from labels. Default true. */
  hideUnlabeled?: boolean;
}

function countActive(
  fields: AdvancedFilterField[],
  values: Record<string, AdvancedFilterValue>,
): number {
  let count = 0;
  for (const field of fields) {
    if (field.type === "numberRange") {
      const minId = field.minId ?? `${field.id}Min`;
      const maxId = field.maxId ?? `${field.id}Max`;
      if (values[minId]?.trim()) count += 1;
      if (values[maxId]?.trim()) count += 1;
      continue;
    }
    if (values[field.id]?.trim()) count += 1;
  }
  return count;
}

function DebouncedSearch({
  id,
  label,
  placeholder,
  value,
  debounceMs,
  onCommit,
}: {
  id: string;
  label?: string;
  placeholder?: string;
  value: string;
  debounceMs: number;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draft !== value) onCommit(draft);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [draft, debounceMs, onCommit, value]);

  return (
    <Input
      id={id}
      label={label}
      value={draft}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}

export function AdvancedFilters({
  labels,
  fields,
  values,
  onChange,
  onClear,
  clearKey = "clearFilters",
  className,
  hideUnlabeled = true,
}: AdvancedFiltersProps) {
  const visibleFields = useMemo(() => {
    if (!hideUnlabeled) return fields;
    return fields.filter((field) => Boolean(labels[field.labelKey]));
  }, [fields, hideUnlabeled, labels]);

  const activeCount = countActive(visibleFields, values);
  const clearLabel = labels[clearKey];

  if (visibleFields.length === 0) return null;

  const setValue = (id: string, next: string) => {
    onChange({ ...values, [id]: next });
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }
    const cleared: Record<string, AdvancedFilterValue> = { ...values };
    for (const field of visibleFields) {
      if (field.type === "numberRange") {
        cleared[field.minId ?? `${field.id}Min`] = "";
        cleared[field.maxId ?? `${field.id}Max`] = "";
      } else {
        cleared[field.id] = "";
      }
    }
    onChange(cleared);
  };

  const searchFields = visibleFields.filter((f) => f.type === "search");
  const otherFields = visibleFields.filter((f) => f.type !== "search");

  return (
    <div
      className={cn(
        "space-y-3 rounded-radius border border-border bg-grad-card p-3",
        className,
      )}
    >
      {searchFields.map((field) => {
        if (field.type !== "search") return null;
        return (
          <DebouncedSearch
            key={field.id}
            id={`filter-${field.id}`}
            label={labels[field.labelKey]}
            placeholder={
              field.placeholderKey
                ? labels[field.placeholderKey]
                : labels[field.labelKey]
            }
            value={values[field.id] ?? ""}
            debounceMs={field.debounceMs ?? 300}
            onCommit={(next) => setValue(field.id, next)}
          />
        );
      })}

      {otherFields.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {otherFields.map((field) => {
            if (field.type === "select") {
              const allLabel = field.allKey
                ? labels[field.allKey]
                : labels.filterAll;
              return (
                <Select
                  key={field.id}
                  id={`filter-${field.id}`}
                  label={labels[field.labelKey]}
                  value={values[field.id] ?? ""}
                  options={[
                    ...(allLabel ? [{ value: "", label: allLabel }] : []),
                    ...field.options,
                  ]}
                  onChange={(event) => setValue(field.id, event.target.value)}
                />
              );
            }

            if (field.type === "numberRange") {
              const minId = field.minId ?? `${field.id}Min`;
              const maxId = field.maxId ?? `${field.id}Max`;
              return (
                <div key={field.id} className="space-y-1 sm:col-span-2 md:col-span-1">
                  <p className="font-sans text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted">
                    {labels[field.labelKey]}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      id={`filter-${minId}`}
                      label={
                        field.minKey ? labels[field.minKey] : labels.creditsMin
                      }
                      type="number"
                      value={values[minId] ?? ""}
                      onChange={(event) => setValue(minId, event.target.value)}
                    />
                    <Input
                      id={`filter-${maxId}`}
                      label={
                        field.maxKey ? labels[field.maxKey] : labels.creditsMax
                      }
                      type="number"
                      value={values[maxId] ?? ""}
                      onChange={(event) => setValue(maxId, event.target.value)}
                    />
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      ) : null}

      {clearLabel && activeCount > 0 ? (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={handleClear}>
            {clearLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
