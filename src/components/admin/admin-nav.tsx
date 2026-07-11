"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { key: "dashboard", href: "/admin/dashboard" },
  { key: "levers", href: "/admin/levers" },
  { key: "crm", href: "/admin/crm" },
  { key: "content", href: "/admin/content" },
  { key: "settings", href: "/admin/settings" },
  { key: "account", href: "/admin/account" },
  { key: "integrations", href: "/admin/integrations" },
  { key: "users", href: "/admin/users" },
] as const;

export function AdminNav({ labels }: { labels: Record<string, string> }) {
  const pathname = usePathname();

  return (
    <nav
      className="-mx-[var(--shell-gutter)] mb-6 border-b border-border bg-surface-2/60"
      aria-label="admin"
    >
      <div className="portal-shell flex gap-1.5 overflow-x-auto py-2">
        {NAV_ITEMS.map((item) => {
          const label = labels[item.key];
          if (!label) {
            return null;
          }

          const isActive =
            item.href === "/admin/dashboard"
              ? pathname === "/admin/dashboard" || pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "inline-flex shrink-0 items-center rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                isActive
                  ? "bg-surface-1 text-text-primary shadow-sm"
                  : "text-text-secondary hover:bg-surface-1/70 hover:text-text-primary",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
