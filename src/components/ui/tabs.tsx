"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
  listClassName?: string;
  panelClassName?: string;
}

export function Tabs({
  tabs,
  defaultTabId,
  activeTabId,
  onTabChange,
  className,
  listClassName,
  panelClassName,
}: TabsProps) {
  const [internalTabId, setInternalTabId] = useState(
    defaultTabId ?? tabs[0]?.id ?? "",
  );

  const currentTabId = activeTabId ?? internalTabId;
  const activeTab = tabs.find((tab) => tab.id === currentTabId) ?? tabs[0];

  const selectTab = (tabId: string) => {
    if (activeTabId === undefined) {
      setInternalTabId(tabId);
    }
    onTabChange?.(tabId);
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div
        role="tablist"
        className={cn(
          "flex flex-wrap gap-1 border-b border-border",
          listClassName,
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === currentTabId;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              disabled={tab.disabled}
              onClick={() => selectTab(tab.id)}
              className={cn(
                "rounded-t-radius px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                isActive
                  ? "border-b-2 border-fill-primary text-text-primary"
                  : "text-text-muted hover:text-text-secondary",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {activeTab ? (
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab.id}`}
          aria-labelledby={`tab-${activeTab.id}`}
          className={cn(panelClassName)}
        >
          {activeTab.content}
        </div>
      ) : null}
    </div>
  );
}
