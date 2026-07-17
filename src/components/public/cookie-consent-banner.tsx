"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

const STORAGE_KEY = "nextgenmove_cookie_consent";

export function CookieConsentBanner({
  siteName = "Nextgenmove",
  message,
  acceptLabel = "Accept",
  declineLabel = "Decline",
  privacyHref = "/privacy",
  privacyLabel = "Privacy",
}: {
  siteName?: string;
  message?: string;
  acceptLabel?: string;
  declineLabel?: string;
  privacyHref?: string;
  privacyLabel?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const choose = (value: "accepted" | "declined") => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-surface-1 p-4 shadow-lg sm:p-5"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="mx-auto flex max-w-[1100px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-secondary">
          {message ||
            `${siteName} uses essential cookies to keep you signed in and optional analytics cookies to improve the product.`}{" "}
          <Link
            href={privacyHref}
            className="font-semibold text-fill-accent hover:opacity-80"
          >
            {privacyLabel}
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={() => choose("declined")}>
            {declineLabel}
          </Button>
          <Button onClick={() => choose("accepted")}>{acceptLabel}</Button>
        </div>
      </div>
    </div>
  );
}
