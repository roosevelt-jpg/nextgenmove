"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface StudentNavLabels {
  dashboard?: string;
  store?: string;
  profile?: string;
  settings?: string;
}

const NAV_ITEMS = [
  { key: "dashboard" as const, href: "/student" },
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
        if (!label) {
          return null;
        }

        const isActive =
          item.href === "/student"
            ? pathname === "/student"
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
