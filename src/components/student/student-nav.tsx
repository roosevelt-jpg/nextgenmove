"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface StudentNavLabels {
  dashboard?: string;
  wallet?: string;
  store?: string;
  profile?: string;
  settings?: string;
}

const NAV_ITEMS = [
  { key: "dashboard" as const, href: "/student/dashboard" },
  { key: "wallet" as const, href: "/student/wallet" },
  { key: "store" as const, href: "/student/store" },
  { key: "profile" as const, href: "/student/profile" },
  { key: "settings" as const, href: "/student/settings" },
];

export function StudentNav({ labels }: { labels: StudentNavLabels }) {
  const pathname = usePathname();

  return (
    <nav
      className="mb-6 flex gap-4 overflow-x-auto border-b border-border text-sm sm:gap-6"
      aria-label="student"
    >
      {NAV_ITEMS.map((item) => {
        const label = labels[item.key];
        if (!label) return null;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              "shrink-0 border-b-2 pb-2 font-medium transition-colors",
              active
                ? "border-fill-accent text-fill-accent"
                : "border-transparent text-text-secondary hover:text-text-primary",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
