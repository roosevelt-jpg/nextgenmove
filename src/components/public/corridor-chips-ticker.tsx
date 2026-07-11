"use client";

import type { RoutesMarqueeSettings } from "@/types/cms";
import styles from "./corridor-chips-ticker.module.css";
import { cn } from "@/lib/utils";

export function CorridorChipsTicker({
  chips,
  settings,
}: {
  chips: string[];
  settings?: RoutesMarqueeSettings | null;
}) {
  if (!chips.length) return null;

  const enabled = settings?.enabled !== false;
  const speedSec = Math.max(8, Number(settings?.speedSec) || 24);
  const direction = settings?.direction === "rtl" ? "rtl" : "ltr";
  const easing =
    settings?.easing === "ease" || settings?.easing === "ease-in-out"
      ? settings.easing
      : "linear";
  const pauseOnHover = settings?.pauseOnHover !== false;

  const chipNodes = chips.map((chip) => (
    <span key={chip} className={styles.chip}>
      {chip}
    </span>
  ));

  if (!enabled || chips.length < 2) {
    return <div className={cn(styles.ticker, styles.staticRow)}>{chipNodes}</div>;
  }

  // Duplicate the set so the loop is seamless (track is 2× width).
  const loopKey = chips.join("|");

  return (
    <div className={styles.ticker}>
      <div
        className={cn(styles.viewport, pauseOnHover && styles.pauseOnHover)}
        style={
          {
            "--corridor-duration": `${speedSec}s`,
            "--corridor-easing": easing,
          } as React.CSSProperties
        }
        data-direction={direction}
      >
        <div className={styles.track} aria-hidden>
          <div className={styles.chunk}>{chipNodes}</div>
          <div className={styles.chunk}>
            {chips.map((chip) => (
              <span key={`${loopKey}-dup-${chip}`} className={styles.chip}>
                {chip}
              </span>
            ))}
          </div>
        </div>
        <span className="sr-only">{chips.join(", ")}</span>
      </div>
    </div>
  );
}
