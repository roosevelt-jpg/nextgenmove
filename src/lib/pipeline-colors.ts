/** Distinct stage colors for hiring funnel / pipeline bars (design tokens). */
export const PIPELINE_STAGE_PALETTE = [
  "#4b3f9c", // purple — New match
  "#3d6fd9", // blue — Intro sent
  "#c97a2e", // amber — Interviewing
  "#2d6a4f", // green — Offer
  "#b84a6a", // rose — Placed
  "#6b5bb8", // lavender
  "#1a7a8c", // teal
] as const;

/**
 * Resolve a funnel/pipeline bar color. Uses stage order index against a fixed
 * palette so every stage is visually distinct (even when counts are 0).
 * A valid hex from CMS is kept when present and not a washed-out neutral.
 */
export function resolveStageColor(
  color: string | null | undefined,
  index = 0,
): string {
  const palette =
    PIPELINE_STAGE_PALETTE[index % PIPELINE_STAGE_PALETTE.length]!;
  const trimmed = typeof color === "string" ? color.trim() : "";
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return palette;
  }
  const muted = new Set([
    "#8a8898",
    "#9b9a91",
    "#f1efe8",
    "#e7e4d9",
    "#fafaf7",
    "#f3efe8",
    "#faeeda",
    "#eeedfe",
    "#2e2768", // old near-duplicate purple
  ]);
  if (muted.has(trimmed.toLowerCase())) {
    return palette;
  }
  return trimmed;
}

/** Soft track tint from a solid stage color. */
export function stageTrackBackground(color: string): string {
  return `color-mix(in srgb, ${color} 22%, #ffffff)`;
}
