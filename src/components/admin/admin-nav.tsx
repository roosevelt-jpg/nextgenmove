"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { key: "dashboard", href: "/admin" },
  { key: "levers", href: "/admin/levers" },
  { key: "crm", href: "/admin/crm" },
  { key: "content", href: "/admin/content" },
  { key: "integrations", href: "/admin/integrations" },
  { key: "users", href: "/admin/users" },
] as const;

export function AdminNav({ labels }: { labels: Record<string, string> }) {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-6 border-b border-border pb-3 text-sm" aria-label="admin">
      {NAV_ITEMS.map((item) => {
        const label = labels[item.key];
        if (!label) {
          return null;
        }

        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "text-text-secondary transition-colors hover:text-text-primary",
              isActive && "font-medium text-text-primary",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
