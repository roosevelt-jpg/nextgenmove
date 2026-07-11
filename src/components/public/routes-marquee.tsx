"use client";

import { useMemo } from "react";
import type {
  PageHomeDocument,
  RouteMarqueeItem,
  RoutesMarqueeSettings,
} from "@/types/cms";
import styles from "./routes-marquee.module.css";
import { cn } from "@/lib/utils";

function normalizeItems(
  items: RouteMarqueeItem[] | undefined,
  fallbackCodes: string[],
): string[] {
  const fromCms = (items ?? [])
    .map((item) => {
      const code = item.code?.trim();
      const label = item.label?.trim();
      if (code && label && label !== code) return `${code} · ${label}`;
      return code || label || "";
    })
    .filter(Boolean);

  if (fromCms.length) return fromCms;
  return fallbackCodes.filter(Boolean);
}

export function RoutesMarqueeBar({
  content,
  fallbackCodes,
}: {
  content: PageHomeDocument | null;
  fallbackCodes: string[];
}) {
  const settings: RoutesMarqueeSettings = content?.routesMarquee ?? {};
  const enabled = settings.enabled !== false;
  const speedSec = Math.max(8, Number(settings.speedSec) || 28);
  const direction = settings.direction === "rtl" ? "rtl" : "ltr";
  const easing =
    settings.easing === "ease" || settings.easing === "ease-in-out"
      ? settings.easing
      : "linear";
  const pauseOnHover = settings.pauseOnHover !== false;
  const separator = settings.separator ?? " · ";

  const items = useMemo(
    () => normalizeItems(content?.currentRoutesItems, fallbackCodes),
    [content?.currentRoutesItems, fallbackCodes],
  );

  if (!content?.currentRoutesLabel && !items.length) {
    return null;
  }

  const sequence = items.join(separator);
  const track = items.length ? `${sequence}${separator}${sequence}` : "";

  return (
    <div className={styles.routeBar}>
      <div className={styles.routeBarInner}>
        {content?.currentRoutesLabel ? (
          <span className={styles.routeBarLabel}>
            {content.currentRoutesLabel}
          </span>
        ) : null}

        {items.length ? (
          enabled ? (
            <div
              className={cn(
                styles.marqueeViewport,
                pauseOnHover && styles.pauseOnHover,
              )}
              style={
                {
                  "--marquee-duration": `${speedSec}s`,
                  "--marquee-easing": easing,
                } as React.CSSProperties
              }
              data-direction={direction}
            >
              <div className={styles.marqueeTrack} aria-hidden>
                <span className={styles.marqueeChunk}>{track}</span>
              </div>
              <span className="sr-only">{sequence}</span>
            </div>
          ) : (
            <span className={styles.routeBarCodes}>{sequence}</span>
          )
        ) : null}
      </div>
    </div>
  );
}
