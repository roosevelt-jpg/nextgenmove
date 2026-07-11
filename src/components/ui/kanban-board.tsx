"use client";

import { useMemo, useState, type DragEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface KanbanColumn {
  id: string;
  title: ReactNode;
  color?: string;
}

export interface KanbanItem {
  id: string;
  columnId: string;
  content: ReactNode;
}

export interface KanbanBoardProps {
  columns: KanbanColumn[];
  items: KanbanItem[];
  onItemMove?: (itemId: string, toColumnId: string) => void;
  className?: string;
  columnClassName?: string;
  cardClassName?: string;
}

export function KanbanBoard({
  columns,
  items,
  onItemMove,
  className,
  columnClassName,
  cardClassName,
}: KanbanBoardProps) {
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dropTargetColumnId, setDropTargetColumnId] = useState<string | null>(
    null,
  );

  const itemsByColumn = useMemo(() => {
    const grouped = new Map<string, KanbanItem[]>();

    for (const column of columns) {
      grouped.set(column.id, []);
    }

    for (const item of items) {
      const bucket = grouped.get(item.columnId);
      if (bucket) {
        bucket.push(item);
      }
    }

    return grouped;
  }, [columns, items]);

  const handleDragStart = (itemId: string) => {
    setDraggingItemId(itemId);
  };

  const handleDragEnd = () => {
    setDraggingItemId(null);
    setDropTargetColumnId(null);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, columnId: string) => {
    event.preventDefault();
    setDropTargetColumnId(columnId);
  };

  const handleDrop = (columnId: string) => {
    if (draggingItemId) {
      onItemMove?.(draggingItemId, columnId);
    }
    handleDragEnd();
  };

  return (
    <div className={cn("flex gap-4 overflow-x-auto pb-2", className)}>
      {columns.map((column) => {
        const columnItems = itemsByColumn.get(column.id) ?? [];
        const isDropTarget = dropTargetColumnId === column.id;

        return (
          <div
            key={column.id}
            className={cn(
              "flex min-w-64 flex-1 flex-col rounded-radius border border-border bg-grad-card",
              isDropTarget && "ring-2 ring-border-accent",
              columnClassName,
            )}
            onDragOver={(event) => handleDragOver(event, column.id)}
            onDragLeave={() => setDropTargetColumnId(null)}
            onDrop={() => handleDrop(column.id)}
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              {column.color ? (
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: column.color }}
                  aria-hidden="true"
                />
              ) : null}
              <div className="text-sm font-medium text-text-primary">
                {column.title}
              </div>
            </div>
            <div className="flex flex-col gap-2 p-3">
              {columnItems.map((item) => (
                <div
                  key={item.id}
                  draggable={Boolean(onItemMove)}
                  onDragStart={() => handleDragStart(item.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "cursor-grab rounded-radius border border-border bg-grad-card p-3 text-sm text-text-primary shadow-sm active:cursor-grabbing",
                    draggingItemId === item.id && "opacity-50",
                    cardClassName,
                  )}
                >
                  {item.content}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
