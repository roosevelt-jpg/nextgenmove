"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

export interface DataTableColumn<T extends Record<string, unknown>> {
  key: keyof T & string;
  header: ReactNode;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string;
  emptyState?: ReactNode;
  className?: string;
  headerClassName?: string;
  rowClassName?: string;
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) {
    return 0;
  }

  if (a == null) {
    return -1;
  }

  if (b == null) {
    return 1;
  }

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  return String(a).localeCompare(String(b));
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  emptyState,
  className,
  headerClassName,
  rowClassName,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedData = useMemo(() => {
    if (!sortKey) {
      return data;
    }

    return [...data].sort((rowA, rowB) => {
      const comparison = compareValues(rowA[sortKey], rowB[sortKey]);
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortDirection, sortKey]);

  const toggleSort = (key: string, sortable?: boolean) => {
    if (!sortable) {
      return;
    }

    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  return (
    <div className={cn("w-full overflow-x-auto rounded-radius border border-border bg-grad-card", className)}>
      <table className="w-full min-w-0 border-collapse text-left text-sm md:min-w-[48rem]">
        <thead className={cn("bg-transparent", headerClassName)}>
          <tr>
            {columns.map((column) => {
              const isSorted = sortKey === column.key;

              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    isSorted
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className={cn(
                    "px-3 py-3 font-medium text-text-secondary sm:px-4 sm:whitespace-nowrap",
                    column.sortable && "cursor-pointer select-none hover:text-text-primary",
                    column.className,
                  )}
                  onClick={() => toggleSort(column.key, column.sortable)}
                >
                  <span className="inline-flex items-center gap-1">
                    {column.header}
                    {isSorted ? (
                      <span aria-hidden="true" className="font-mono text-xs">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    ) : null}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-text-muted"
              >
                {emptyState}
              </td>
            </tr>
          ) : (
            sortedData.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                className={cn(
                  "border-t border-border bg-surface-1 hover:bg-surface-2/60",
                  rowClassName,
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-3 py-3 text-text-primary sm:px-4 sm:whitespace-nowrap",
                      column.className,
                    )}
                  >
                    {column.render
                      ? column.render(row)
                      : (row[column.key] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
