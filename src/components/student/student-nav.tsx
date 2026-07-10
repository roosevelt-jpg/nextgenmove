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
    <nav className="mb-5 flex flex-wrap gap-6 text-sm" aria-label="student">
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
              "pb-2 text-text-secondary transition-colors hover:text-text-primary",
              isActive && "border-b-2 border-text-primary font-medium text-text-primary",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
