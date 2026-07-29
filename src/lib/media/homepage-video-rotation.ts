const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * When the live library is larger than the homepage window, advance the
 * visible slice once per UTC day. The marquee still animates the active slice.
 */
export function selectRotatingHomepageWindow<T>(
  items: T[],
  windowSize: number,
  nowMs: number = Date.now(),
): T[] {
  if (!items.length || windowSize <= 0) return [];
  if (items.length <= windowSize) return items.slice();

  const day = Math.floor(nowMs / MS_PER_DAY);
  const start = (day * windowSize) % items.length;
  const out: T[] = [];
  for (let i = 0; i < windowSize; i += 1) {
    out.push(items[(start + i) % items.length]!);
  }
  return out;
}
