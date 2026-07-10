"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const CONTENT_SECTIONS = [
  { key: "library", href: "/admin/content" },
  { key: "home", href: "/admin/content/home" },
  { key: "about", href: "/admin/content/about" },
  { key: "careers", href: "/admin/content/careers" },
  { key: "journal", href: "/admin/content/journal" },
  { key: "howItWorks", href: "/admin/content/how-it-works" },
  { key: "pricing", href: "/admin/content/pricing" },
  { key: "tracks", href: "/admin/content/tracks" },
] as const;

export function AdminContentNav({ labels }: { labels: Record<string, string> }) {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap gap-4 border-b border-border pb-3 text-sm">
      {CONTENT_SECTIONS.map((section) => {
        const label = labels[section.key];
        if (!label) {
          return null;
        }

        const isActive =
          section.href === "/admin/content"
            ? pathname === "/admin/content"
            : pathname === section.href;

        return (
          <Link
            key={section.key}
            href={section.href}
            className={cn(
              "text-text-secondary hover:text-text-primary",
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
