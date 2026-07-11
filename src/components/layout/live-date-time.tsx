"use client";

import { useEffect, useState } from "react";
import { useLocaleOptional } from "@/components/i18n/locale-provider";

export function LiveDateTime({
  className,
  timeZone,
}: {
  className?: string;
  timeZone?: string;
}) {
  const localeCtx = useLocaleOptional();
  const locale = localeCtx?.locale ?? undefined;
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!now) {
    return (
      <span className={className} aria-hidden>
        —
      </span>
    );
  }

  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const date = now.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: tz,
  });
  const time = now.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: tz,
  });

  return (
    <time dateTime={now.toISOString()} className={className} title={tz}>
      <span>{date}</span>
      <span className="mx-1.5 text-text-muted">·</span>
      <span className="font-mono tabular-nums">{time}</span>
    </time>
  );
}
