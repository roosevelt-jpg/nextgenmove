"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultOpenIds?: string[];
  className?: string;
  itemClassName?: string;
}

export function Accordion({
  items,
  allowMultiple = false,
  defaultOpenIds = [],
  className,
  itemClassName,
}: AccordionProps) {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpenIds);

  const toggleItem = (id: string, disabled?: boolean) => {
    if (disabled) {
      return;
    }

    setOpenIds((current) => {
      const isOpen = current.includes(id);

      if (isOpen) {
        return current.filter((openId) => openId !== id);
      }

      if (allowMultiple) {
        return [...current, id];
      }

      return [id];
    });
  };

  return (
    <div className={cn("flex flex-col divide-y divide-border rounded-radius border border-border", className)}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        const panelId = `accordion-panel-${item.id}`;
        const triggerId = `accordion-trigger-${item.id}`;

        return (
          <div key={item.id} className={cn("bg-surface-1", itemClassName)}>
            <button
              type="button"
              id={triggerId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              disabled={item.disabled}
              onClick={() => toggleItem(item.id, item.disabled)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-text-primary transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>{item.title}</span>
              <span
                aria-hidden="true"
                className={cn(
                  "font-mono text-text-muted transition-transform",
                  isOpen && "rotate-180",
                )}
              >
                ▾
              </span>
            </button>
            {isOpen ? (
              <div
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                className="border-t border-border px-4 py-3 text-sm text-text-secondary"
              >
                {item.content}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
