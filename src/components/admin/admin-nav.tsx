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
      className="mb-6 flex gap-4 overflow-x-auto border-b border-border text-sm sm:gap-6"
      aria-label="admin"
    >
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
              "-mb-px shrink-0 whitespace-nowrap border-b-2 border-transparent pb-3 text-text-secondary transition-colors hover:text-text-primary",
              isActive && "border-fill-primary font-bold text-text-primary",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
